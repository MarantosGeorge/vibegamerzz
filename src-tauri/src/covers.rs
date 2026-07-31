//! Cover image storage.
//!
//! Every cover the app knows about is copied into `<app data>/covers/` and the
//! database stores only the file name. That keeps a library self-contained: it
//! renders offline, and it does not break when the user tidies up the folder
//! they originally picked an image from.

use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Manager};

/// Reject anything implausible for a cover so a mistyped URL cannot fill the
/// user's disk.
const MAX_COVER_BYTES: usize = 12 * 1024 * 1024;

const ALLOWED_EXTENSIONS: [&str; 6] = ["jpg", "jpeg", "png", "webp", "gif", "avif"];

static COUNTER: AtomicU32 = AtomicU32::new(0);

/// `<app data>/covers`, created on first use.
pub fn covers_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not locate the application data folder: {e}"))?
        .join("covers");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create the covers folder: {e}"))?;
    Ok(dir)
}

fn normalise_extension(raw: &str) -> String {
    let ext = raw.trim_start_matches('.').to_ascii_lowercase();
    let ext = ext
        .split(['?', '#'])
        .next()
        .unwrap_or_default()
        .to_string();
    if ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        ext
    } else {
        "jpg".to_string()
    }
}

/// Time-plus-counter rather than a hash of the bytes: two games are allowed to
/// have the same cover, and deleting one must not blank the other.
fn unique_file_name(extension: &str) -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("cover-{millis}-{n}.{extension}")
}

fn write_cover(app: &AppHandle, bytes: &[u8], extension: &str) -> Result<String, String> {
    if bytes.is_empty() {
        return Err("That image is empty.".into());
    }
    if bytes.len() > MAX_COVER_BYTES {
        return Err("That image is larger than 12 MB. Please choose a smaller one.".into());
    }
    let dir = covers_dir(app)?;
    let name = unique_file_name(extension);
    std::fs::write(dir.join(&name), bytes)
        .map_err(|e| format!("Could not save the cover image: {e}"))?;
    Ok(name)
}

#[cfg(test)]
mod tests {
    use super::{normalise_extension, unique_file_name};

    #[test]
    fn normalises_image_extensions() {
        assert_eq!(normalise_extension("JPG"), "jpg");
        assert_eq!(normalise_extension(".PNG"), "png");
        assert_eq!(normalise_extension("webp"), "webp");
        // Query strings and fragments ride along on URLs.
        assert_eq!(normalise_extension("jpg?width=600"), "jpg");
        assert_eq!(normalise_extension("png#anchor"), "png");
        // Anything unrecognised falls back rather than writing an odd file type.
        assert_eq!(normalise_extension("exe"), "jpg");
        assert_eq!(normalise_extension(""), "jpg");
    }

    #[test]
    fn generates_distinct_file_names() {
        let a = unique_file_name("png");
        let b = unique_file_name("png");
        assert_ne!(a, b, "two covers saved in the same millisecond must not collide");
        assert!(a.ends_with(".png"));
    }
}

/// Absolute path to the app's data folder, used by the UI to build image URLs
/// and by the "Open data folder" button in Settings.
#[tauri::command]
pub fn data_dir(app: AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not locate the application data folder: {e}"))?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create the application data folder: {e}"))?;
    Ok(dir.to_string_lossy().to_string())
}

/// Absolute path to the covers folder.
#[tauri::command]
pub fn covers_dir_path(app: AppHandle) -> Result<String, String> {
    Ok(covers_dir(&app)?.to_string_lossy().to_string())
}

/// Download a cover (from IGDB, or from a URL the user pasted) into the covers
/// folder. Returns the stored file name.
#[tauri::command]
pub async fn save_cover_from_url(app: AppHandle, url: String) -> Result<String, String> {
    let url = url.trim().to_string();
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("Image links must start with http:// or https://".into());
    }

    let extension = url
        .rsplit('/')
        .next()
        .and_then(|segment| segment.rsplit_once('.').map(|(_, ext)| ext.to_string()))
        .map(|ext| normalise_extension(&ext))
        .unwrap_or_else(|| "jpg".to_string());

    let response = reqwest::Client::new()
        .get(&url)
        .header("User-Agent", "gamerzz")
        .send()
        .await
        .map_err(|_| "Could not reach that image link. Check your internet connection.".to_string())?;

    if !response.status().is_success() {
        return Err(format!(
            "That image link returned an error ({}).",
            response.status().as_u16()
        ));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|_| "The image download was interrupted.".to_string())?;

    write_cover(&app, &bytes, &extension)
}

/// Copy an image the user picked with the file dialog into the covers folder.
#[tauri::command]
pub fn save_cover_from_file(app: AppHandle, path: String) -> Result<String, String> {
    let source = PathBuf::from(&path);
    let extension = source
        .extension()
        .map(|e| normalise_extension(&e.to_string_lossy()))
        .unwrap_or_else(|| "jpg".to_string());

    let bytes = std::fs::read(&source)
        .map_err(|_| "Could not read that image file. It may have been moved or deleted.".to_string())?;

    write_cover(&app, &bytes, &extension)
}

/// Remove a stored cover. A missing file is not an error: the goal is that the
/// folder ends up without it.
#[tauri::command]
pub fn delete_cover(app: AppHandle, file_name: String) -> Result<(), String> {
    // Defend against a name that tries to escape the covers folder.
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return Err("Invalid cover file name.".into());
    }
    let path = covers_dir(&app)?.join(&file_name);
    if path.exists() {
        std::fs::remove_file(&path)
            .map_err(|e| format!("Could not delete the cover image: {e}"))?;
    }
    Ok(())
}
