//! IGDB integration.
//!
//! IGDB authenticates through Twitch: a Client ID and Client Secret are
//! exchanged for a short-lived app access token.
//!
//! Both values live here, in the Rust side of the app, written to a file in the
//! app data folder. The webview never receives them - it can ask *whether*
//! credentials are configured and it can replace them, but it cannot read them
//! back. Note the honest limit of this: it keeps secrets out of the frontend
//! and out of devtools, but anyone who owns the machine can read the file.
//! Every user is expected to register their own Twitch application.

use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};

/// IGDB's platform id for "PC (Microsoft Windows)". This app is PC-only, so
/// every search is constrained to it.
const PC_PLATFORM_ID: u32 = 6;

const TOKEN_URL: &str = "https://id.twitch.tv/oauth2/token";
const GAMES_URL: &str = "https://api.igdb.com/v4/games";

#[derive(Serialize, Deserialize, Clone)]
pub struct Credentials {
    client_id: String,
    client_secret: String,
}

/// Cached app access token, so a burst of searches does not re-authenticate
/// on every keystroke.
#[derive(Default)]
pub struct TokenCache(Mutex<Option<CachedToken>>);

#[derive(Clone)]
struct CachedToken {
    token: String,
    /// Unix seconds.
    expires_at: u64,
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn credentials_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not locate the application data folder: {e}"))?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create the application data folder: {e}"))?;
    Ok(dir.join("igdb-credentials.json"))
}

fn read_credentials(app: &AppHandle) -> Result<Option<Credentials>, String> {
    let path = credentials_path(app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("Could not read the saved IGDB credentials: {e}"))?;
    match serde_json::from_str::<Credentials>(&raw) {
        Ok(creds) => Ok(Some(creds)),
        // A corrupt file should not brick the app - treat it as "not set up".
        Err(_) => Ok(None),
    }
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
}

async fn fetch_token(creds: &Credentials) -> Result<CachedToken, String> {
    let response = reqwest::Client::new()
        .post(TOKEN_URL)
        .query(&[
            ("client_id", creds.client_id.as_str()),
            ("client_secret", creds.client_secret.as_str()),
            ("grant_type", "client_credentials"),
        ])
        .send()
        .await
        .map_err(|_| {
            "Could not reach Twitch to sign in. Check your internet connection.".to_string()
        })?;

    if response.status() == 400 || response.status() == 401 || response.status() == 403 {
        return Err(
            "Twitch rejected those credentials. Check the Client ID and Client Secret and try again."
                .to_string(),
        );
    }
    if !response.status().is_success() {
        return Err(format!(
            "Twitch returned an unexpected error ({}). Please try again shortly.",
            response.status().as_u16()
        ));
    }

    let body: TokenResponse = response
        .json()
        .await
        .map_err(|_| "Twitch returned a response this app did not understand.".to_string())?;

    Ok(CachedToken {
        token: body.access_token,
        // Refresh a minute early rather than racing the expiry.
        expires_at: now_secs() + body.expires_in.saturating_sub(60),
    })
}

async fn token_for(
    creds: &Credentials,
    cache: &State<'_, TokenCache>,
) -> Result<String, String> {
    // Scoped so the lock is never held across an await.
    {
        let guard = cache.0.lock().map_err(|_| "Internal lock error.".to_string())?;
        if let Some(cached) = guard.as_ref() {
            if cached.expires_at > now_secs() {
                return Ok(cached.token.clone());
            }
        }
    }

    let fresh = fetch_token(creds).await?;

    if let Ok(mut guard) = cache.0.lock() {
        *guard = Some(fresh.clone());
    }
    Ok(fresh.token)
}

/// Whether IGDB search is available. The UI hides the search box when false.
#[tauri::command]
pub fn igdb_configured(app: AppHandle) -> Result<bool, String> {
    Ok(read_credentials(&app)?.is_some())
}

/// Verify a pair of credentials against Twitch, and only save them if they
/// work. "Save" and "Test connection" are deliberately the same operation, so
/// it is impossible to store credentials that were never checked.
#[tauri::command]
pub async fn save_igdb_credentials(
    app: AppHandle,
    cache: State<'_, TokenCache>,
    client_id: String,
    client_secret: String,
) -> Result<(), String> {
    let creds = Credentials {
        client_id: client_id.trim().to_string(),
        client_secret: client_secret.trim().to_string(),
    };
    if creds.client_id.is_empty() || creds.client_secret.is_empty() {
        return Err("Please fill in both the Client ID and the Client Secret.".into());
    }

    let token = fetch_token(&creds).await?;

    let json = serde_json::to_string_pretty(&creds)
        .map_err(|e| format!("Could not prepare the credentials for saving: {e}"))?;
    std::fs::write(credentials_path(&app)?, json)
        .map_err(|e| format!("Could not save the credentials: {e}"))?;

    if let Ok(mut guard) = cache.0.lock() {
        *guard = Some(token);
    }
    Ok(())
}

#[tauri::command]
pub fn clear_igdb_credentials(app: AppHandle, cache: State<'_, TokenCache>) -> Result<(), String> {
    let path = credentials_path(&app)?;
    if path.exists() {
        std::fs::remove_file(&path)
            .map_err(|e| format!("Could not remove the saved credentials: {e}"))?;
    }
    if let Ok(mut guard) = cache.0.lock() {
        *guard = None;
    }
    Ok(())
}

#[derive(Deserialize)]
struct RawCover {
    image_id: Option<String>,
}

#[derive(Deserialize)]
struct RawGenre {
    name: Option<String>,
}

#[derive(Deserialize)]
struct RawGame {
    id: i64,
    name: String,
    summary: Option<String>,
    first_release_date: Option<i64>,
    cover: Option<RawCover>,
    genres: Option<Vec<RawGenre>>,
    /// IGDB's aggregate of external critic scores, 0-100. Note this is
    /// deliberately not IGDB's own `rating` field, which is a user score.
    aggregated_rating: Option<f64>,
}

#[derive(Serialize)]
pub struct IgdbGame {
    pub igdb_id: i64,
    pub name: String,
    pub summary: Option<String>,
    pub release_date: Option<String>,
    /// Critic score out of 100. Absent for a great many games - indie and
    /// recent releases especially - so the UI has to cope with `None`.
    pub critic_rating: Option<u32>,
    pub genres: Vec<String>,
    /// Full-size cover, downloaded when the user picks this result.
    pub cover_url: Option<String>,
    /// Small cover, shown in the results list.
    pub thumb_url: Option<String>,
}

/// IGDB reports critic scores as a float like `92.3457`. Round to a whole
/// number, and drop anything outside 0-100 rather than storing a value the
/// database CHECK constraint would reject.
fn critic_score(raw: Option<f64>) -> Option<u32> {
    let value = raw?;
    if !value.is_finite() {
        return None;
    }
    let rounded = value.round();
    if !(0.0..=100.0).contains(&rounded) {
        return None;
    }
    Some(rounded as u32)
}

/// Days-to-calendar-date, so a release date can be formatted without pulling in
/// a date library for this one job. (Howard Hinnant's civil_from_days.)
fn iso_date_from_unix(seconds: i64) -> String {
    let days = seconds.div_euclid(86_400);
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{y:04}-{m:02}-{d:02}")
}

/// IGDB's query language is a plain string, so the search term has to be
/// escaped rather than parameterised.
fn escape_search_term(query: &str) -> String {
    query
        .chars()
        .filter(|c| *c != '"' && *c != '\\' && *c != '\n' && *c != '\r' && *c != ';')
        .take(100)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{critic_score, escape_search_term, iso_date_from_unix};

    #[test]
    fn rounds_critic_scores_and_rejects_impossible_ones() {
        assert_eq!(critic_score(None), None);
        assert_eq!(critic_score(Some(92.3457)), Some(92));
        assert_eq!(critic_score(Some(92.5)), Some(93));
        assert_eq!(critic_score(Some(0.0)), Some(0));
        assert_eq!(critic_score(Some(100.0)), Some(100));
        // Out of range would violate the database CHECK constraint.
        assert_eq!(critic_score(Some(-1.0)), None);
        assert_eq!(critic_score(Some(100.6)), None);
        assert_eq!(critic_score(Some(f64::NAN)), None);
    }

    #[test]
    fn converts_unix_timestamps_to_iso_dates() {
        assert_eq!(iso_date_from_unix(0), "1970-01-01");
        // Hades, 17 September 2020.
        assert_eq!(iso_date_from_unix(1_600_300_800), "2020-09-17");
        // Leap day, the case an off-by-one in the civil-date maths would miss.
        assert_eq!(iso_date_from_unix(1_582_934_400), "2020-02-29");
        assert_eq!(iso_date_from_unix(951_782_400), "2000-02-29");
        // 1900 was not a leap year; 1 March 1900.
        assert_eq!(iso_date_from_unix(-2_203_891_200), "1900-03-01");
        // A time late in the day must not roll over into the next one.
        assert_eq!(iso_date_from_unix(1_600_300_800 + 86_399), "2020-09-17");
    }

    #[test]
    fn strips_characters_that_would_break_the_igdb_query() {
        assert_eq!(escape_search_term("Zelda"), "Zelda");
        assert_eq!(
            escape_search_term("\"; fields *; where id != null; //"),
            " fields * where id != null //"
        );
        assert_eq!(escape_search_term("back\\slash"), "backslash");
        assert_eq!(escape_search_term("line\nbreak"), "linebreak");
        // Long input is truncated rather than rejected.
        assert_eq!(escape_search_term(&"a".repeat(500)).len(), 100);
    }
}

#[tauri::command]
pub async fn igdb_search(
    app: AppHandle,
    cache: State<'_, TokenCache>,
    query: String,
) -> Result<Vec<IgdbGame>, String> {
    let term = escape_search_term(query.trim());
    if term.is_empty() {
        return Ok(Vec::new());
    }

    let creds = read_credentials(&app)?
        .ok_or_else(|| "IGDB is not set up yet. Add your credentials in Settings.".to_string())?;
    let token = token_for(&creds, &cache).await?;

    // `version_parent = null` drops the "Deluxe Edition"-style duplicates that
    // otherwise crowd out the game the user is actually looking for.
    let body = format!(
        "search \"{term}\"; \
         fields name,summary,first_release_date,cover.image_id,genres.name,aggregated_rating; \
         where platforms = ({PC_PLATFORM_ID}) & version_parent = null; \
         limit 24;"
    );

    let response = reqwest::Client::new()
        .post(GAMES_URL)
        .header("Client-ID", &creds.client_id)
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/json")
        .body(body)
        .send()
        .await
        .map_err(|_| "Could not reach IGDB. Check your internet connection.".to_string())?;

    if response.status() == 401 || response.status() == 403 {
        return Err(
            "IGDB rejected your credentials. Check them in Settings - the Client Secret may have been regenerated."
                .to_string(),
        );
    }
    if response.status() == 429 {
        return Err("IGDB is rate limiting this app. Wait a few seconds and try again.".to_string());
    }
    if !response.status().is_success() {
        return Err(format!(
            "IGDB returned an unexpected error ({}).",
            response.status().as_u16()
        ));
    }

    let raw: Vec<RawGame> = response
        .json()
        .await
        .map_err(|_| "IGDB returned a response this app did not understand.".to_string())?;

    Ok(raw
        .into_iter()
        .map(|g| {
            let image_id = g.cover.and_then(|c| c.image_id);
            IgdbGame {
                igdb_id: g.id,
                name: g.name,
                summary: g.summary,
                release_date: g.first_release_date.map(iso_date_from_unix),
                critic_rating: critic_score(g.aggregated_rating),
                genres: g
                    .genres
                    .unwrap_or_default()
                    .into_iter()
                    .filter_map(|genre| genre.name)
                    .collect(),
                cover_url: image_id.as_ref().map(|id| {
                    format!("https://images.igdb.com/igdb/image/upload/t_cover_big_2x/{id}.jpg")
                }),
                thumb_url: image_id.as_ref().map(|id| {
                    format!("https://images.igdb.com/igdb/image/upload/t_cover_small/{id}.jpg")
                }),
            }
        })
        .collect())
}
