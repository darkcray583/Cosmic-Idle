const SAVE_KEY = "cosmic-idle-v4";

const LAUNCH_YEAR_END = "2026-12-31T23:59:59Z";
const EVENT_END = "2026-06-15T23:59:59Z";

const RARITY_COLORS = {
  common: "#9a9ab8",
  rare: "#00ffe1",
  epic: "#b44dff",
  legendary: "#ffcc00",
  limited: "#ff6b2b",
};

const PARTICLE_PALETTES = {
  default: ["#00ffe1", "#ff3d9a", "#b44dff", "#ffcc00", "#ff6b2b"],
  ember: ["#ff6b2b", "#ff3d9a", "#ffcc00", "#ff4500", "#ffd166"],
  frost: ["#a8e6ff", "#00ffe1", "#6eb5ff", "#ffffff", "#b44dff"],
  toxic: ["#39ff14", "#00ffe1", "#7fff00", "#b44dff", "#adff2f"],
  royal: ["#ffcc00", "#b44dff", "#ff3d9a", "#ffd700", "#e066ff"],
};

const COSMETICS = [
  { id: "crystal_default", name: "Prism Core", type: "crystal", icon: "◇", desc: "The classic void crystal", rarity: "common", price: 0, currency: "free", skin: "skin-default" },
  { id: "crystal_solar", name: "Solar Flare", type: "crystal", icon: "☀", desc: "Burning hot taps", rarity: "rare", price: 2500, currency: "stardust", skin: "skin-solar" },
  { id: "crystal_frost", name: "Frozen Comet", type: "crystal", icon: "❄", desc: "Ice cold prestige", rarity: "rare", price: 8000, currency: "stardust", skin: "skin-frost" },
  { id: "crystal_void", name: "Void Heart", type: "crystal", icon: "♥", desc: "Dark matter energy", rarity: "epic", price: 45, currency: "gems", skin: "skin-void" },
  { id: "crystal_gold", name: "Midas Shard", type: "crystal", icon: "✦", desc: "Everything turns to gold", rarity: "legendary", price: 120, currency: "gems", skin: "skin-gold" },

  { id: "nebula_default", name: "Classic Nebula", type: "nebula", icon: "🌌", desc: "Purple-pink void sky", rarity: "common", price: 0, currency: "free", skin: "nebula-default" },
  { id: "nebula_sunset", name: "Supernova Sunset", type: "nebula", icon: "🌅", desc: "Warm cosmic horizon", rarity: "rare", price: 5000, currency: "stardust", skin: "nebula-sunset" },
  { id: "nebula_matrix", name: "Digital Rift", type: "nebula", icon: "🟩", desc: "Glitch in the matrix", rarity: "epic", price: 35, currency: "gems", skin: "nebula-matrix" },

  { id: "particles_default", name: "Stardust Burst", type: "particles", icon: "✨", desc: "Default tap sparks", rarity: "common", price: 0, currency: "free", palette: "default" },
  { id: "particles_ember", name: "Ember Storm", type: "particles", icon: "🔥", desc: "Fire on every tap", rarity: "rare", price: 3500, currency: "stardust", palette: "ember" },
  { id: "particles_frost", name: "Blizzard Bits", type: "particles", icon: "🌨", desc: "Icy shatter effect", rarity: "rare", price: 3500, currency: "stardust", palette: "frost" },
  { id: "particles_royal", name: "Royal Cascade", type: "particles", icon: "👑", desc: "Gold & purple rain", rarity: "legendary", price: 75, currency: "gems", palette: "royal" },

  { id: "title_rookie", name: "Void Rookie", type: "title", icon: "🌱", desc: "Just getting started", rarity: "common", price: 0, currency: "free", label: "Void Rookie" },
  { id: "title_tapper", name: "Crystal Tapper", type: "title", icon: "👆", desc: "Friends with the crystal", rarity: "common", price: 1500, currency: "stardust", label: "Crystal Tapper" },
  { id: "title_whale", name: "Void Whale", type: "title", icon: "🐋", desc: "Big spender energy", rarity: "epic", price: 50, currency: "gems", label: "Void Whale" },
  { id: "title_legend", name: "Cosmic Legend", type: "title", icon: "⭐", desc: "Peak void status", rarity: "legendary", price: 150, currency: "gems", label: "Cosmic Legend" },

  { id: "trail_default", name: "No Trail", type: "trail", icon: "—", desc: "Clean orbit path", rarity: "common", price: 0, currency: "free", skin: "trail-none" },
  { id: "trail_comet", name: "Comet Tail", type: "trail", icon: "☄", desc: "Generators leave streaks", rarity: "rare", price: 6000, currency: "stardust", skin: "trail-comet" },
  { id: "trail_rainbow", name: "Prism Orbit", type: "trail", icon: "🌈", desc: "Rainbow orbit glow", rarity: "epic", price: 40, currency: "gems", skin: "trail-rainbow" },
];

const LIMITED_ITEMS = [
  {
    id: "limited_holo_crystal",
    name: "Holo Crystal '26",
    type: "crystal",
    icon: "💿",
    desc: "Buy during event — yours forever. Shop closes when timer ends.",
    rarity: "limited",
    price: 60,
    currency: "gems",
    skin: "skin-holo",
    availableUntil: EVENT_END,
    forever: true,
  },
  {
    id: "limited_neon_title",
    name: "NEON DRIP",
    type: "title",
    icon: "🔮",
    desc: "Event-only title. Miss the window, miss the drip — forever.",
    rarity: "limited",
    price: 25000,
    currency: "stardust",
    label: "NEON DRIP",
    availableUntil: EVENT_END,
    forever: true,
  },
  {
    id: "limited_toxic_burst",
    name: "Toxic Burst",
    type: "particles",
    icon: "☢",
    desc: "Limited particles — keep forever once bought.",
    rarity: "limited",
    price: 55,
    currency: "gems",
    palette: "toxic",
    availableUntil: EVENT_END,
    forever: true,
  },
  {
    id: "limited_pet_prism",
    name: "Prism Sprite",
    type: "pet",
    icon: "🧚",
    desc: "Event Voidling — only hatchable during Summer Void '26.",
    rarity: "limited",
    price: 80,
    currency: "gems",
    petSpecies: "pet_prism_sprite",
    availableUntil: EVENT_END,
    forever: true,
  },
  {
    id: "limited_gear_halo",
    name: "Founder's Halo",
    type: "pet_gear",
    icon: "😇",
    desc: "Limited pet aura — +8 ATK. Permanent once owned.",
    rarity: "limited",
    price: 45000,
    currency: "stardust",
    gearId: "gear_halo",
    availableUntil: EVENT_END,
    forever: true,
  },
];

/* ── Voidlings (pets) ── */
const PET_SPECIES = [
  { id: "pet_wisp", name: "Void Wisp", icon: "👻", desc: "Your first companion. Free.", rarity: "common", price: 0, currency: "free", base: { atk: 5, def: 3, hp: 30 } },
  { id: "pet_mothling", name: "Mothling", icon: "🦋", desc: "Fluffy night hunter.", rarity: "rare", price: 8000, currency: "stardust", base: { atk: 12, def: 6, hp: 45 } },
  { id: "pet_comet_fox", name: "Comet Fox", icon: "🦊", desc: "Fast and fierce.", rarity: "epic", price: 40, currency: "gems", base: { atk: 18, def: 10, hp: 55 } },
  { id: "pet_prism_sprite", name: "Prism Sprite", icon: "🧚", desc: "Event exclusive Voidling.", rarity: "limited", price: 0, currency: "limited", base: { atk: 22, def: 14, hp: 60 } },
  { id: "pet_void_serpent", name: "Void Serpent", icon: "🐍", desc: "Arena champion's choice.", rarity: "legendary", price: 100, currency: "gems", base: { atk: 28, def: 16, hp: 80 } },
];

const PET_GEAR = [
  { id: "gear_spark_collar", name: "Spark Collar", slot: "collar", icon: "⚡", desc: "+4 ATK", rarity: "common", price: 2000, currency: "stardust", stats: { atk: 4 } },
  { id: "gear_void_charm", name: "Void Charm", slot: "charm", icon: "🔮", desc: "+3 DEF, +10 HP", rarity: "rare", price: 15, currency: "gems", stats: { def: 3, hp: 10 } },
  { id: "gear_star_aura", name: "Star Aura", slot: "aura", icon: "✨", desc: "+6 ATK, +5 DEF", rarity: "epic", price: 35, currency: "gems", stats: { atk: 6, def: 5 } },
  { id: "gear_halo", name: "Founder's Halo", slot: "aura", icon: "😇", desc: "+8 ATK (limited)", rarity: "limited", price: 0, currency: "limited", stats: { atk: 8 } },
];

const ARENA_ENEMIES = [
  { name: "Dust Golem", icon: "🪨", scale: 1 },
  { name: "Shadow Mite", icon: "🕷", scale: 1.1 },
  { name: "Crystal Gnat", icon: "🦟", scale: 1.2 },
  { name: "Nebula Leech", icon: "🩸", scale: 1.35 },
  { name: "Void Stalker", icon: "👁", scale: 1.5 },
  { name: "Star Wraith", icon: "💀", scale: 1.7 },
  { name: "Cosmic Titan", icon: "🗿", scale: 2 },
];

/* Collectible medals — displayed in medal case (not achievements) */
const COLLECTIBLE_MEDALS = [
  {
    id: "medal_launch_2026",
    name: "Founding Void Walker",
    subtitle: "Launch Year 2026",
    desc: "Claimed by playing during Cosmic Idle's first year.",
    ribbon: "gold",
    claimOnly: true,
    availableUntil: LAUNCH_YEAR_END,
  },
];

const ACHIEVEMENTS = [
  { id: "ach_first_tap", name: "First Contact", desc: "Tap the crystal once", icon: "👆", check: (s) => s.totalTaps >= 1 },
  { id: "ach_tapper", name: "Finger Workout", desc: "Tap 500 times", icon: "💪", check: (s) => s.totalTaps >= 500 },
  { id: "ach_tapper_god", name: "Tap God", desc: "Tap 10,000 times", icon: "⚡", check: (s) => s.totalTaps >= 10000 },
  { id: "ach_first_gen", name: "Passive Income", desc: "Buy your first generator", icon: "🏭", check: (s) => totalGens(s) >= 1 },
  { id: "ach_empire", name: "Mini Empire", desc: "Own 25 generators total", icon: "🏙", check: (s) => totalGens(s) >= 25 },
  { id: "ach_rich", name: "Stardust Millionaire", desc: "Earn 1M stardust lifetime", icon: "💰", check: (s) => s.totalEarned >= 1e6 },
  { id: "ach_gacha", name: "Capsule Addict", desc: "Pull 10 capsules", icon: "🎰", check: (s) => s.pullCount >= 10 },
  { id: "ach_collector", name: "Fashionista", desc: "Own 8 cosmetics", icon: "👗", check: (s) => (s.inventory?.owned?.length || 0) >= 8 },
  { id: "ach_gem_spender", name: "Big Gem Energy", desc: "Spend 100 void gems", icon: "💎", check: (s) => (s.gemsSpent || 0) >= 100 },
  { id: "ach_combo", name: "Combo Master", desc: "Hit a ×3 combo multiplier", icon: "🔥", check: (s) => s.maxComboMult >= 3 },
  { id: "ach_lucky", name: "Void Lucky", desc: "Find a Void Gem from tapping", icon: "💎", check: (s) => (s.gemDropsFound || 0) >= 1 },
  { id: "ach_arena", name: "Arena Fighter", desc: "Win 10 arena battles", icon: "⚔", check: (s) => (s.pets?.arenaWins || 0) >= 10 },
  { id: "ach_pet_master", name: "Voidling Trainer", desc: "Own 3 Voidlings", icon: "🐾", check: (s) => (s.pets?.owned?.length || 0) >= 3 },
];

const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));

const GEM_EXCHANGE = [
  { id: "ex_10", gems: 10, stardust: 25000, label: "Handful" },
  { id: "ex_50", gems: 50, stardust: 110000, label: "Pouch", bonus: "+5 bonus" },
  { id: "ex_200", gems: 200, stardust: 400000, label: "Vault", bonus: "+30 bonus" },
];

const REAL_MONEY_PACKAGES = [
  { id: "iap_80", gems: 80, price: 0.99, label: "$0.99", tag: "Starter" },
  { id: "iap_420", gems: 420, price: 4.99, label: "$4.99", tag: "Popular", bonus: "+20 bonus gems" },
  { id: "iap_900", gems: 900, price: 9.99, label: "$9.99", tag: "Best Value", bonus: "+100 bonus gems" },
  { id: "iap_2000", gems: 2000, price: 19.99, label: "$19.99", tag: "Whale Pack", bonus: "+300 bonus gems" },
];

const STARTER_OWNED = [
  "crystal_default", "nebula_default", "particles_default",
  "title_rookie", "trail_default",
];

const DEFAULT_EQUIPPED = {
  crystal: "crystal_default",
  nebula: "nebula_default",
  particles: "particles_default",
  title: "title_rookie",
  trail: "trail_default",
};

function getAllShopItems() {
  return [...COSMETICS, ...LIMITED_ITEMS.filter(isLimitedAvailable)];
}

function getCosmeticById(id) {
  return COSMETICS.find((c) => c.id === id) || LIMITED_ITEMS.find((c) => c.id === id);
}

function getPetSpecies(id) {
  return PET_SPECIES.find((p) => p.id === id);
}

function getPetGear(id) {
  return PET_GEAR.find((g) => g.id === id);
}

function getShopPetSpecies() {
  return PET_SPECIES.filter((p) => p.currency !== "limited" && p.price > 0);
}

function isLimitedAvailable(item) {
  if (!item.availableUntil) return true;
  return Date.now() < new Date(item.availableUntil).getTime();
}

function limitedTimeLeft(item) {
  const ms = new Date(item.availableUntil).getTime() - Date.now();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return d + "d " + h + "h left";
  const m = Math.floor((ms % 3600000) / 60000);
  return h + "h " + m + "m left";
}
