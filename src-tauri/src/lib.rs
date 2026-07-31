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
