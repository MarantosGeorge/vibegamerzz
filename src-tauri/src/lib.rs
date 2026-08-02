mod covers;
mod igdb;

use tauri_plugin_sql::{Migration, MigrationKind};

/// The database file, resolved by the SQL plugin inside the app data folder.
pub const DB_URL: &str = "sqlite:gamerzz.db";

/// Schema.
///
/// `status` is the single source of truth for progress - there is deliberately
/// no separate `completed` flag, because two fields describing one fact drift
/// apart. "Completed" is `status = 'completed'` everywhere.
///
/// It also holds "Playing", which is activity rather than progress, so a game
/// being played does not advertise how far through it is. That is deliberate
/// too - see docs/adr/0001.
///
/// `platform` holds a PC storefront (Steam, GOG, ...), never console hardware.
///
/// This is version 1 of the table, not its current shape - see
/// `RATINGS_AND_GENRES` below for the columns added since.
const INITIAL_SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS games (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    title            TEXT    NOT NULL,
    platform         TEXT    NOT NULL DEFAULT 'Other',
    status           TEXT    NOT NULL DEFAULT 'backlog'
                     CHECK (status IN ('backlog','playing','completed','abandoned')),
    achievement_pct  INTEGER NOT NULL DEFAULT 0
                     CHECK (achievement_pct >= 0 AND achievement_pct <= 100),
    playtime_minutes INTEGER NOT NULL DEFAULT 0
                     CHECK (playtime_minutes >= 0),
    rating           INTEGER NOT NULL DEFAULT 0
                     CHECK (rating >= 0 AND rating <= 5),
    cover_file       TEXT,
    notes            TEXT,
    igdb_id          INTEGER,
    summary          TEXT,
    release_date     TEXT,
    is_sample        INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_games_status   ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform);
CREATE INDEX IF NOT EXISTS idx_games_created  ON games(created_at);

CREATE TABLE IF NOT EXISTS storefronts (
    name       TEXT    PRIMARY KEY,
    sort_order INTEGER NOT NULL DEFAULT 100
);

INSERT OR IGNORE INTO storefronts (name, sort_order) VALUES
    ('Steam', 10),
    ('Epic Games', 20),
    ('GOG', 30),
    ('Ubisoft Connect', 40),
    ('EA App', 50),
    ('Battle.net', 60),
    ('Xbox / Microsoft Store', 70),
    ('Rockstar Games Launcher', 80),
    ('Amazon Games', 90),
    ('itch.io', 100),
    ('Riot Client', 110),
    ('Other', 900);
"#;

/// Half-star ratings, critic scores and genres.
///
/// `rating` has to change from INTEGER to REAL to hold 3.5, and SQLite cannot
/// alter a column's type or its CHECK constraint in place - so the table is
/// rebuilt and copied across. Doing it properly rather than relying on SQLite's
/// loose typing keeps the schema an honest description of what is in it.
///
/// `genres` is a JSON array of names rather than a join table. Genres are only
/// ever read as a whole list and filtered in memory, so a second table would buy
/// nothing but joins.
const RATINGS_AND_GENRES: &str = r#"
CREATE TABLE games_v2 (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    title            TEXT    NOT NULL,
    platform         TEXT    NOT NULL DEFAULT 'Other',
    status           TEXT    NOT NULL DEFAULT 'backlog'
                     CHECK (status IN ('backlog','playing','completed','abandoned')),
    achievement_pct  INTEGER NOT NULL DEFAULT 0
                     CHECK (achievement_pct >= 0 AND achievement_pct <= 100),
    playtime_minutes INTEGER NOT NULL DEFAULT 0
                     CHECK (playtime_minutes >= 0),
    rating           REAL    NOT NULL DEFAULT 0
                     CHECK (rating >= 0 AND rating <= 5
                            AND rating * 2 = CAST(rating * 2 AS INTEGER)),
    critic_rating    INTEGER
                     CHECK (critic_rating IS NULL
                            OR (critic_rating >= 0 AND critic_rating <= 100)),
    genres           TEXT,
    cover_file       TEXT,
    notes            TEXT,
    igdb_id          INTEGER,
    summary          TEXT,
    release_date     TEXT,
    is_sample        INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
);

INSERT INTO games_v2 (
    id, title, platform, status, achievement_pct, playtime_minutes, rating,
    cover_file, notes, igdb_id, summary, release_date, is_sample,
    created_at, updated_at
)
SELECT
    id, title, platform, status, achievement_pct, playtime_minutes, rating,
    cover_file, notes, igdb_id, summary, release_date, is_sample,
    created_at, updated_at
FROM games;

DROP TABLE games;
ALTER TABLE games_v2 RENAME TO games;

-- Dropping the table dropped its indexes with it.
CREATE INDEX IF NOT EXISTS idx_games_status   ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform);
CREATE INDEX IF NOT EXISTS idx_games_created  ON games(created_at);
"#;

/// Six statuses instead of four: `attempted` and `platinum` join the set.
///
/// Purely a widening - every value the old CHECK allowed is still allowed, and
/// no row is touched. Games sitting in `playing` stay in `playing` even though
/// that bucket used to carry everything in flight; re-filing them is the user's
/// call, not the migration's. Same for `completed` games at 100% achievements,
/// which are left for the user to promote to `platinum` if they want to - see
/// docs/adr/0002, the app advises and never corrects.
///
/// SQLite cannot alter a CHECK constraint in place, so this is the same rebuild
/// and copy-across as `RATINGS_AND_GENRES` above.
const SIX_STATUSES: &str = r#"
CREATE TABLE games_v3 (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    title            TEXT    NOT NULL,
    platform         TEXT    NOT NULL DEFAULT 'Other',
    status           TEXT    NOT NULL DEFAULT 'backlog'
                     CHECK (status IN ('backlog','attempted','completed',
                                       'platinum','abandoned','playing')),
    achievement_pct  INTEGER NOT NULL DEFAULT 0
                     CHECK (achievement_pct >= 0 AND achievement_pct <= 100),
    playtime_minutes INTEGER NOT NULL DEFAULT 0
                     CHECK (playtime_minutes >= 0),
    rating           REAL    NOT NULL DEFAULT 0
                     CHECK (rating >= 0 AND rating <= 5
                            AND rating * 2 = CAST(rating * 2 AS INTEGER)),
    critic_rating    INTEGER
                     CHECK (critic_rating IS NULL
                            OR (critic_rating >= 0 AND critic_rating <= 100)),
    genres           TEXT,
    cover_file       TEXT,
    notes            TEXT,
    igdb_id          INTEGER,
    summary          TEXT,
    release_date     TEXT,
    is_sample        INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
);

INSERT INTO games_v3 (
    id, title, platform, status, achievement_pct, playtime_minutes, rating,
    critic_rating, genres, cover_file, notes, igdb_id, summary, release_date,
    is_sample, created_at, updated_at
)
SELECT
    id, title, platform, status, achievement_pct, playtime_minutes, rating,
    critic_rating, genres, cover_file, notes, igdb_id, summary, release_date,
    is_sample, created_at, updated_at
FROM games;

DROP TABLE games;
ALTER TABLE games_v3 RENAME TO games;

-- Dropping the table dropped its indexes with it.
CREATE INDEX IF NOT EXISTS idx_games_status   ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform);
CREATE INDEX IF NOT EXISTS idx_games_created  ON games(created_at);
"#;

/// Completion becomes absent-able: `achievement_pct` drops its NOT NULL.
///
/// NULL means "this game has no achievements to earn" - Undertale, most itch.io
/// and GOG titles, a good chunk of the Epic catalogue. Until now that was
/// indistinguishable from an honest 0%, which is the opposite fact. See
/// docs/adr/0004.
///
/// One column rather than a `has_achievements` flag beside the number, because
/// two fields describing one fact drift apart - the same reasoning that keeps
/// progress in `status` alone, up at the top of this file. A flag would let the
/// database hold "no achievements" and "87%" at once; NULL cannot.
///
/// Nothing is backfilled. A row sitting at 0 stays a row sitting at 0: the
/// migration cannot tell an unplayed game from an achievement-less one, and
/// guessing from `platform` would mislabel every Epic game that does have them.
/// Re-filing is the user's call, as it was in `SIX_STATUSES`.
///
/// SQLite cannot drop NOT NULL in place, so this is the same rebuild and
/// copy-across as the two migrations above.
const COMPLETION_CAN_BE_ABSENT: &str = r#"
CREATE TABLE games_v4 (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    title            TEXT    NOT NULL,
    platform         TEXT    NOT NULL DEFAULT 'Other',
    status           TEXT    NOT NULL DEFAULT 'backlog'
                     CHECK (status IN ('backlog','attempted','completed',
                                       'platinum','abandoned','playing')),
    achievement_pct  INTEGER
                     CHECK (achievement_pct IS NULL
                            OR (achievement_pct >= 0 AND achievement_pct <= 100)),
    playtime_minutes INTEGER NOT NULL DEFAULT 0
                     CHECK (playtime_minutes >= 0),
    rating           REAL    NOT NULL DEFAULT 0
                     CHECK (rating >= 0 AND rating <= 5
                            AND rating * 2 = CAST(rating * 2 AS INTEGER)),
    critic_rating    INTEGER
                     CHECK (critic_rating IS NULL
                            OR (critic_rating >= 0 AND critic_rating <= 100)),
    genres           TEXT,
    cover_file       TEXT,
    notes            TEXT,
    igdb_id          INTEGER,
    summary          TEXT,
    release_date     TEXT,
    is_sample        INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
);

INSERT INTO games_v4 (
    id, title, platform, status, achievement_pct, playtime_minutes, rating,
    critic_rating, genres, cover_file, notes, igdb_id, summary, release_date,
    is_sample, created_at, updated_at
)
SELECT
    id, title, platform, status, achievement_pct, playtime_minutes, rating,
    critic_rating, genres, cover_file, notes, igdb_id, summary, release_date,
    is_sample, created_at, updated_at
FROM games;

DROP TABLE games;
ALTER TABLE games_v4 RENAME TO games;

-- Dropping the table dropped its indexes with it.
CREATE INDEX IF NOT EXISTS idx_games_status   ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform);
CREATE INDEX IF NOT EXISTS idx_games_created  ON games(created_at);
"#;

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create games and storefronts",
            sql: INITIAL_SCHEMA,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "half-star ratings, critic score and genres",
            sql: RATINGS_AND_GENRES,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "six statuses: add attempted and platinum",
            sql: SIX_STATUSES,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "completion can be absent: achievement_pct is nullable",
            sql: COMPLETION_CAN_BE_ABSENT,
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations())
                .build(),
        )
        .manage(igdb::TokenCache::default())
        .invoke_handler(tauri::generate_handler![
            covers::data_dir,
            covers::covers_dir_path,
            covers::save_cover_from_url,
            covers::save_cover_from_file,
            covers::delete_cover,
            igdb::igdb_configured,
            igdb::save_igdb_credentials,
            igdb::clear_igdb_credentials,
            igdb::igdb_search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
