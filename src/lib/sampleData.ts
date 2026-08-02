/**
 * Demo library, loaded on request from Settings and never on first run - a
 * personal collection should start empty rather than full of someone else's
 * games.
 *
 * These deliberately ship without cover images: they are inserted offline, so
 * they also serve as a look at how the generated placeholder behaves.
 */

import type { Priority, Status } from "../types";

interface SampleGame {
  title: string;
  platform: string;
  status: Status;
  achievement_pct: number | null;
  playtime_minutes: number;
  rating: number;
  critic_rating: number | null;
  genres: string[];
  notes: string | null;
  summary: string | null;
  release_date: string | null;
}

export const SAMPLE_GAMES: SampleGame[] = [
  {
    title: "Hades",
    platform: "Steam",
    status: "platinum",
    achievement_pct: 78,
    playtime_minutes: 3_120,
    rating: 5,
    critic_rating: 93,
    genres: ["Indie", "Role-playing (RPG)", "Hack and slash/Beat 'em up"],
    notes: "Took 42 escape attempts. Worth every one.",
    summary:
      "A rogue-like dungeon crawler in which you defy the god of the dead as you hack and slash out of the Underworld.",
    release_date: "2020-09-17",
  },
  {
    title: "Baldur's Gate 3",
    platform: "GOG",
    status: "attempted",
    achievement_pct: 31,
    playtime_minutes: 6_540,
    rating: 5,
    critic_rating: 96,
    genres: ["Role-playing (RPG)", "Strategy", "Adventure"],
    notes: "Act 2. Still have not worked out how to save everyone.",
    summary:
      "Gather your party and return to the Forgotten Realms in a tale of fellowship, betrayal and sacrifice.",
    release_date: "2023-08-03",
  },
  {
    title: "Cyberpunk 2077",
    platform: "GOG",
    status: "completed",
    // Completed at 100%, so the demo library carries one game that fills the
    // progress bar and one that trips the "Platinum?" hint. See docs/adr/0002.
    achievement_pct: 100,
    playtime_minutes: 5_280,
    rating: 4.5,
    critic_rating: 86,
    genres: ["Role-playing (RPG)", "Shooter", "Adventure"],
    notes: "Phantom Liberty is the best part of it.",
    summary:
      "An open-world action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification.",
    release_date: "2020-12-10",
  },
  {
    title: "Hollow Knight",
    platform: "Steam",
    status: "abandoned",
    achievement_pct: 22,
    playtime_minutes: 640,
    rating: 3.5,
    critic_rating: 87,
    genres: ["Indie", "Platform", "Adventure"],
    notes: "Got stuck on a boss and drifted away. Should go back.",
    summary:
      "Forge your own path in a hand-drawn action adventure through a vast ruined kingdom of insects and heroes.",
    release_date: "2017-02-24",
  },
  {
    title: "Assassin's Creed Odyssey",
    platform: "Ubisoft Connect",
    status: "backlog",
    achievement_pct: 0,
    playtime_minutes: 0,
    rating: 0,
    critic_rating: 83,
    genres: ["Role-playing (RPG)", "Adventure"],
    notes: null,
    summary:
      "Write your own epic odyssey and become a legendary Spartan hero in an ancient Greece torn apart by war.",
    release_date: "2018-10-05",
  },
  {
    title: "Alan Wake 2",
    platform: "Epic Games",
    status: "attempted",
    achievement_pct: 12,
    playtime_minutes: 415,
    rating: 4.5,
    critic_rating: 89,
    genres: ["Shooter", "Adventure"],
    notes: "Playing this one strictly in daylight.",
    summary:
      "A survival horror story in which a writer's words reshape the world around a small town in the Pacific Northwest.",
    release_date: "2023-10-27",
  },
  {
    title: "Stardew Valley",
    platform: "Steam",
    status: "playing",
    achievement_pct: 55,
    playtime_minutes: 9_180,
    rating: 5,
    critic_rating: 89,
    genres: ["Indie", "Role-playing (RPG)", "Simulator"],
    notes: "Year 4. The greenhouse is finally finished.",
    summary:
      "Inherit your grandfather's old farm plot and learn to live off the land in a country life role-playing game.",
    release_date: "2016-02-26",
  },
  {
    title: "Return of the Obra Dinn",
    platform: "itch.io",
    status: "completed",
    // No achievements to earn rather than none earned - itch.io has no
    // achievement system at all. See docs/adr/0004.
    achievement_pct: null,
    playtime_minutes: 570,
    rating: 5,
    // Left unscored on purpose: plenty of IGDB entries have no critic
    // aggregate, and the demo library should show what that looks like.
    critic_rating: null,
    genres: ["Indie", "Puzzle", "Adventure"],
    notes: "Do not read anything about this before playing it.",
    summary:
      "Board a merchant ship lost at sea in 1803 and determine the fate of all sixty souls aboard.",
    release_date: "2018-10-18",
  },
];

interface SampleWishlistEntry {
  title: string;
  priority: Priority;
  critic_rating: number | null;
  genres: string[];
  notes: string | null;
  summary: string | null;
  release_date: string | null;
}

/**
 * Demo wishlist, loaded and cleared by the same Settings action as the games
 * above. It has to cover all three priorities, because the tab groups by them
 * and an empty tier renders nothing at all.
 *
 * The unreleased entry is the point of `Hollow Knight: Silksong` being here: its
 * date is far enough out to still be in the future, so the derived "not out yet"
 * chip has something to show. Nothing stores that fact - see docs/adr/0006.
 */
export const SAMPLE_WISHLIST: SampleWishlistEntry[] = [
  {
    title: "Hollow Knight: Silksong",
    priority: "must-have",
    // No aggregate yet, which is the normal state of an unreleased game and
    // worth demonstrating: it drops out of the critic sort rather than sorting
    // as a zero.
    critic_rating: null,
    genres: ["Indie", "Platform", "Adventure"],
    notes: "Buying this the hour it comes out.",
    summary:
      "Ascend to a haunted kingdom in a sequel to the acclaimed action adventure, playing as the hunter Hornet.",
    release_date: "2099-12-31",
  },
  {
    title: "Elden Ring",
    priority: "must-have",
    critic_rating: 96,
    genres: ["Role-playing (RPG)", "Adventure"],
    notes: "Waiting for a sale, but not waiting very hard.",
    summary:
      "A vast open world of peril and discovery, forged by FromSoftware and George R. R. Martin.",
    release_date: "2022-02-25",
  },
  {
    title: "Disco Elysium",
    priority: "interested",
    critic_rating: 91,
    genres: ["Role-playing (RPG)", "Point-and-click", "Indie"],
    notes: null,
    summary:
      "A detective role-playing game in which you are a broken cop with a murder to solve and a mind to argue with.",
    release_date: "2019-10-15",
  },
  {
    title: "Outer Wilds",
    priority: "interested",
    critic_rating: 85,
    genres: ["Indie", "Adventure", "Puzzle"],
    notes: "Dave will not stop bringing this one up.",
    summary:
      "Explore a handcrafted solar system trapped in an endless time loop, one twenty-two-minute run at a time.",
    release_date: "2019-05-28",
  },
  {
    title: "Total War: Warhammer III",
    priority: "someday",
    critic_rating: 86,
    genres: ["Strategy", "Real Time Strategy (RTS)", "Turn-based strategy (TBS)"],
    notes: "Only once I have finished the second one, which may be never.",
    summary:
      "Command the armies of the Chaos gods or the mortal realms in the finale of a strategy trilogy.",
    release_date: "2022-02-17",
  },
  {
    title: "Kenshi",
    priority: "someday",
    // Left unscored on purpose, so the demo wishlist shows what an entry with
    // no critic aggregate looks like alongside one that simply is not out yet.
    critic_rating: null,
    genres: ["Role-playing (RPG)", "Strategy", "Simulator"],
    notes: null,
    summary:
      "A free-roaming squad-based world where you are nobody, and nothing is balanced in your favour.",
    release_date: "2018-12-06",
  },
];
