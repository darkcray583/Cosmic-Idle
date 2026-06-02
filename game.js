const GENERATORS = [
  { id: "mote", name: "Stardust Mote", icon: "✦", desc: "Tiny but mighty", baseCost: 10, baseProd: 0.2 },
  { id: "moth", name: "Lunar Moth", icon: "🦋", desc: "Flutters through the void", baseCost: 50, baseProd: 1.5 },
  { id: "cat", name: "Nebula Cat", icon: "🐱", desc: "Purr-powered production", baseCost: 400, baseProd: 10 },
  { id: "whale", name: "Void Whale", icon: "🐋", desc: "Cosmic ocean vibes", baseCost: 3000, baseProd: 55 },
  { id: "temple", name: "Star Temple", icon: "🏛", desc: "Ancient worship energy", baseCost: 25000, baseProd: 300 },
];

const UPGRADES = [
  { id: "click1", name: "Crystal Polish", icon: "💎", desc: "2× tap power", cost: 40, req: () => true },
  { id: "click2", name: "Void Focus", icon: "👁", desc: "3× tap power", cost: 350, req: (s) => s.upgrades.click1 },
  { id: "click3", name: "Singularity Touch", icon: "🌀", desc: "5× tap power", cost: 4000, req: (s) => s.upgrades.click2 },
  { id: "gen1", name: "Orbital Boost", icon: "🛸", desc: "+25% all generators", cost: 800, req: (s) => totalGens(s) >= 5 },
  { id: "gen2", name: "Cosmic Overdrive", icon: "⚡", desc: "+50% all generators", cost: 12000, req: (s) => s.upgrades.gen1 },
];

const PULL_REWARDS = [
  { id: "dust", rarity: "common", weight: 28, icon: "✨", title: "Stardust Sprinkle", desc: "+15% stardust instantly!", apply(s) { s.stardust += s.stardust * 0.15 + 50; } },
  { id: "dustBig", rarity: "rare", weight: 18, icon: "🌠", title: "Meteor Shower", desc: "Stardust explosion!", apply(s) { s.stardust += s.stardust * 0.5 + 300; } },
  { id: "boost2x", rarity: "rare", weight: 16, icon: "⚡", title: "2× Void Surge", desc: "Double production for 45s!", apply(s) { addBuff(s, "2× Production", 45, 2); } },
  { id: "clickBoost", rarity: "common", weight: 22, icon: "👆", title: "Tap Frenzy", desc: "3× taps for 30s!", apply(s) { addBuff(s, "3× Taps", 30, null, 3); } },
  { id: "permProd", rarity: "epic", weight: 8, icon: "📈", title: "Permanent Drift", desc: "+5% production forever!", apply(s) { s.permProdMult *= 1.05; } },
  { id: "permClick", rarity: "epic", weight: 7, icon: "💫", title: "Crystal Memory", desc: "+8% tap power forever!", apply(s) { s.permClickMult *= 1.08; } },
  { id: "freeGen", rarity: "legendary", weight: 3, icon: "🎁", title: "Void Gift", desc: "Free level on your best generator!", apply(s) {
    let best = 0, bestId = GENERATORS[0].id;
    for (const g of GENERATORS) {
      if ((s.generators[g.id] || 0) > best) { best = s.generators[g.id]; bestId = g.id; }
    }
    s.generators[bestId] = (s.generators[bestId] || 0) + 1;
  }},
];

const MILESTONES = [
  { gens: 1, msg: "First generator! Passive income unlocked 🚀" },
  { gens: 10, msg: "10 generators — you're building an empire" },
  { gens: 25, msg: "25 generators — the void respects you" },
];

let state = defaultState();
let pullCost = 100;
let lastTick = performance.now();
let saveTimer = 0;
let shopDirty = true;
let lastShopKey = "";
let combo = 0;
let comboTimer = 0;
const COMBO_DECAY = 1.8;
const COMBO_MAX = 30;

const audioCtx = typeof AudioContext !== "undefined" ? new AudioContext() : null;

function defaultState() {
  return {
    stardust: 15,
    voidGems: 5,
    totalEarned: 0,
    totalTaps: 0,
    generators: {},
    upgrades: {},
    permProdMult: 1,
    permClickMult: 1,
    buffs: [],
    pullCount: 0,
    lastSave: Date.now(),
    milestonesHit: {},
    gemsSpent: 0,
    maxComboMult: 1,
    inventory: {
      owned: [...STARTER_OWNED],
      equipped: { ...DEFAULT_EQUIPPED },
      medals: [],
      achievements: [],
    },
    pets: {
      owned: ["pet_wisp"],
      active: "pet_wisp",
      levels: { pet_wisp: 1 },
      xp: { pet_wisp: 0 },
      gearOwned: [],
      gearEquipped: { pet_wisp: { collar: null, charm: null, aura: null } },
      arenaWins: 0,
      arenaWave: 1,
    },
  };
}

function totalGens(s) {
  return Object.values(s.generators).reduce((a, b) => a + b, 0);
}

function genCost(gen, owned) {
  return Math.floor(gen.baseCost * Math.pow(1.14, owned));
}

function getComboMult() {
  if (combo < 3) return 1;
  return 1 + Math.min(combo, COMBO_MAX) * 0.08;
}

function getClickPower() {
  let mult = state.permClickMult;
  if (state.upgrades.click1) mult *= 2;
  if (state.upgrades.click2) mult *= 3;
  if (state.upgrades.click3) mult *= 5;
  for (const b of state.buffs) {
    if (b.clickMult) mult *= b.clickMult;
  }
  mult *= getComboMult();
  return Math.max(1, Math.floor(mult));
}

function getProduction() {
  let total = 0;
  let genMult = state.permProdMult;
  if (state.upgrades.gen1) genMult *= 1.25;
  if (state.upgrades.gen2) genMult *= 1.5;
  for (const b of state.buffs) {
    if (b.prodMult) genMult *= b.prodMult;
  }
  for (const g of GENERATORS) {
    const owned = state.generators[g.id] || 0;
    total += owned * g.baseProd * genMult;
  }
  return total;
}

function addBuff(s, name, seconds, prodMult, clickMult) {
  s.buffs.push({ name, expires: Date.now() + seconds * 1000, prodMult, clickMult });
}

function tickBuffs() {
  state.buffs = state.buffs.filter((b) => b.expires > Date.now());
}

function formatNum(n) {
  if (n < 1000) return Math.floor(n).toLocaleString();
  if (n < 1e6) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  if (n < 1e9) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
  return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
}

function playTone(freq, dur, type = "sine", vol = 0.08) {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove("show"), 2400);
}

function flashScreen(kind) {
  const el = document.getElementById("screen-flash");
  el.className = "flash on" + (kind ? " " + kind : "");
  setTimeout(() => { el.className = "flash"; }, 80);
}

function spawnFloat(x, y, text, extraClass) {
  const el = document.createElement("span");
  el.className = "float-num" + (extraClass ? " " + extraClass : "");
  el.textContent = text;
  el.style.left = x + "px";
  el.style.top = y + "px";
  document.getElementById("float-container").appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function bumpStardustDisplay() {
  const el = document.querySelector(".stardust-display");
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

let lastAffordStardust = -1;

function shopSnapshot() {
  const parts = [];
  for (const g of GENERATORS) parts.push(g.id + ":" + (state.generators[g.id] || 0));
  for (const u of UPGRADES) parts.push(u.id + ":" + (state.upgrades[u.id] ? 1 : 0));
  return parts.join("|");
}

function updatePlayShopAffordability() {
  const floor = Math.floor(state.stardust);
  if (floor === lastAffordStardust) return;
  lastAffordStardust = floor;

  document.querySelectorAll("#generator-shop .shop-item").forEach((row) => {
    const gen = GENERATORS.find((g) => g.id === row.dataset.buyGen);
    if (!gen) return;
    const cost = genCost(gen, state.generators[gen.id] || 0);
    const can = state.stardust >= cost;
    row.classList.toggle("can-buy", can);
    row.classList.toggle("locked", !can);
    const costEl = row.querySelector(".shop-cost");
    if (costEl) costEl.textContent = formatNum(cost) + " ✨";
  });

  document.querySelectorAll("#upgrade-shop .shop-item").forEach((row) => {
    const up = UPGRADES.find((u) => u.id === row.dataset.buyUp);
    if (!up) return;
    const can = state.stardust >= up.cost;
    row.classList.toggle("can-buy", can);
    row.classList.toggle("locked", !can);
  });
}

function renderShopIfNeeded() {
  const key = shopSnapshot();
  if (!shopDirty && key === lastShopKey) {
    updatePlayShopAffordability();
    return;
  }
  shopDirty = false;
  lastShopKey = key;
  renderShop();
  lastAffordStardust = Math.floor(state.stardust);
}

function renderShop() {
  const genShop = document.getElementById("generator-shop");
  genShop.innerHTML = "";
  for (const g of GENERATORS) {
    const owned = state.generators[g.id] || 0;
    const cost = genCost(g, owned);
    const canBuy = state.stardust >= cost;
    const el = document.createElement("div");
    el.className = "shop-item" + (canBuy ? " can-buy" : " locked");
    el.dataset.buyGen = g.id;
    el.innerHTML =
      '<span class="shop-icon">' + g.icon + '</span>' +
      '<div class="shop-info"><div class="shop-name">' + g.name +
      ' <span style="color:var(--muted);font-weight:600">Lv.' + owned + '</span></div>' +
      '<div class="shop-desc">' + g.desc + '</div>' +
      '<div class="shop-meta">+' + g.baseProd + '/s each</div></div>' +
      '<span class="shop-cost">' + formatNum(cost) + ' ✨</span>';
    genShop.appendChild(el);
  }

  const upShop = document.getElementById("upgrade-shop");
  upShop.innerHTML = "";
  for (const u of UPGRADES) {
    if (state.upgrades[u.id]) continue;
    if (!u.req(state)) continue;
    const canBuy = state.stardust >= u.cost;
    const el = document.createElement("div");
    el.className = "shop-item" + (canBuy ? " can-buy" : " locked");
    el.dataset.buyUp = u.id;
    el.innerHTML =
      '<span class="shop-icon">' + u.icon + '</span>' +
      '<div class="shop-info"><div class="shop-name">' + u.name + '</div>' +
      '<div class="shop-desc">' + u.desc + '</div></div>' +
      '<span class="shop-cost">' + formatNum(u.cost) + ' ✨</span>';
    upShop.appendChild(el);
  }
}

function markShopDirty() {
  shopDirty = true;
}

function buyGen(id, el) {
  const gen = GENERATORS.find((g) => g.id === id);
  const owned = state.generators[id] || 0;
  const cost = genCost(gen, owned);
  if (state.stardust < cost) {
    showToast("Need " + formatNum(cost - state.stardust) + " more ✨");
    playTone(180, 0.12, "sawtooth", 0.05);
    return;
  }
  state.stardust -= cost;
  state.generators[id] = owned + 1;
  playTone(440 + owned * 20, 0.15, "square", 0.06);
  playTone(660 + owned * 15, 0.2, "sine", 0.05);
  burstParticles(window.innerWidth / 2, window.innerHeight * 0.7, 12, gen.icon);
  if (el) {
    el.classList.add("just-bought");
    setTimeout(() => el.classList.remove("just-bought"), 450);
  }
  showToast("+" + gen.name + " Lv." + (owned + 1) + "! 🎉");
  checkMilestones();
  checkAchievements();
  renderOrbits();
  markShopDirty();
  updateHUD();
  saveGame();
}

function buyUpgrade(id, el) {
  const up = UPGRADES.find((u) => u.id === id);
  if (state.upgrades[id] || !up.req(state)) return;
  if (state.stardust < up.cost) {
    showToast("Need " + formatNum(up.cost - state.stardust) + " more ✨");
    playTone(180, 0.12, "sawtooth", 0.05);
    return;
  }
  state.stardust -= up.cost;
  state.upgrades[id] = true;
  playTone(523, 0.1, "sine", 0.07);
  playTone(784, 0.15, "sine", 0.06);
  playTone(1046, 0.25, "sine", 0.05);
  flashScreen();
  burstParticles(window.innerWidth / 2, window.innerHeight * 0.65, 20, up.icon);
  if (el) el.classList.add("just-bought");
  showToast(up.name + " unlocked! ⚡");
  checkAchievements();
  markShopDirty();
  updateHUD();
  saveGame();
}

function checkMilestones() {
  const total = totalGens(state);
  for (const m of MILESTONES) {
    if (total >= m.gens && !state.milestonesHit[m.gens]) {
      state.milestonesHit[m.gens] = true;
      showToast(m.msg);
      playTone(880, 0.3, "sine", 0.08);
    }
  }
}

function onCrystalClick(e) {
  combo = Math.min(combo + 1, COMBO_MAX + 10);
  comboTimer = COMBO_DECAY;
  const mult = getComboMult();
  if (mult > state.maxComboMult) state.maxComboMult = mult;

  const isCrit = Math.random() < 0.08 + combo * 0.002;
  let gain = getClickPower();
  if (isCrit) {
    gain = Math.floor(gain * 5);
    flashScreen("crit");
    playTone(1200, 0.08, "square", 0.07);
    playTone(800, 0.2, "sine", 0.06);
  } else {
    playTone(320 + combo * 8, 0.06, "sine", 0.05);
  }

  state.stardust += gain;
  state.totalEarned += gain;
  state.totalTaps++;

  const crystal = document.getElementById("crystal");
  crystal.classList.remove("hit", "crit-hit");
  void crystal.offsetWidth;
  crystal.classList.add(isCrit ? "crit-hit" : "hit");
  setTimeout(() => crystal.classList.remove("hit", "crit-hit"), isCrit ? 200 : 80);

  const zone = document.getElementById("click-zone").getBoundingClientRect();
  const x = e.clientX - zone.left - 30;
  const y = e.clientY - zone.top - 20;
  if (isCrit) {
    spawnFloat(x, y, "CRIT! +" + formatNum(gain), "crit");
  } else {
    spawnFloat(x, y, "+" + formatNum(gain), combo >= 5 ? "combo" : "");
  }

  burstParticles(e.clientX, e.clientY, isCrit ? 18 : 6);
  tryGemDrop(e.clientX, e.clientY);
  bumpStardustDisplay();
  if (state.totalTaps % 50 === 0) checkAchievements();
  markShopDirty();
  updateHUD();
}

function renderOrbits() {
  const ring = document.getElementById("orbit-ring");
  ring.innerHTML = "";
  let idx = 0;
  for (const g of GENERATORS) {
    const count = Math.min(state.generators[g.id] || 0, 8);
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "orbit-icon";
      el.textContent = g.icon;
      const angle = ((idx + i * 0.7) / 12) * 360;
      const dist = 78 + (idx % 3) * 8;
      const dur = 8 + (idx % 4) * 2;
      el.style.transform = "rotate(" + angle + "deg) translateX(" + dist + "px)";
      el.style.animationDuration = dur + "s";
      el.style.animationDelay = -(idx * 0.4) + "s";
      ring.appendChild(el);
      idx++;
    }
  }
}

function updateHUD() {
  document.getElementById("stardust-count").textContent = formatNum(state.stardust);
  document.getElementById("gem-count").textContent = state.voidGems;
  document.getElementById("per-sec").textContent = "+" + formatNum(getProduction()) + "/s";
  document.getElementById("click-power").textContent = "+" + formatNum(getClickPower()) + " per tap";
  document.getElementById("pull-cost").textContent = formatNum(pullCost);
  const btnPull = document.getElementById("btn-pull");
  const canPull = state.stardust >= pullCost;
  btnPull.disabled = !canPull;
  btnPull.classList.toggle("cant-afford", !canPull);
  document.getElementById("pull-hint").textContent = canPull
    ? "Random buffs & rewards"
    : "Need " + formatNum(pullCost - state.stardust) + " more ✨";

  const comboPct = Math.min(100, (combo / COMBO_MAX) * 100);
  const fill = document.getElementById("combo-fill");
  fill.style.width = comboPct + "%";
  fill.classList.toggle("hot", combo >= 8);
  document.getElementById("combo-mult").textContent = "×" + getComboMult().toFixed(1);

  const gemHint = document.getElementById("gem-drop-hint");
  if (gemHint) {
    const power = getClickPower();
    gemHint.textContent = power >= GEM_DROP_MIN_POWER
      ? "Rare 💎 drop chance active (tap power " + power + "+)"
      : "Reach " + GEM_DROP_MIN_POWER + " tap power for rare 💎 drops";
  }

  const buffBar = document.getElementById("buff-bar");
  buffBar.innerHTML = "";
  for (const b of state.buffs) {
    const left = Math.ceil((b.expires - Date.now()) / 1000);
    const pill = document.createElement("span");
    pill.className = "buff-pill";
    pill.textContent = b.name + " " + left + "s";
    buffBar.appendChild(pill);
  }

  renderShopIfNeeded();
  renderEconomyIfNeeded();
}

function weightedPull() {
  const total = PULL_REWARDS.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const r of PULL_REWARDS) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return PULL_REWARDS[0];
}

function showPullModal(reward) {
  const modal = document.getElementById("pull-modal");
  const card = document.getElementById("modal-card");
  card.className = "modal-card rarity-" + reward.rarity;
  document.getElementById("modal-rarity").textContent = reward.rarity.toUpperCase();
  document.getElementById("modal-rarity").style.color =
    reward.rarity === "legendary" ? "var(--gold)" :
    reward.rarity === "epic" ? "var(--purple)" :
    reward.rarity === "rare" ? "var(--cyan)" : "var(--muted)";
  document.getElementById("modal-icon").textContent = reward.icon;
  document.getElementById("modal-title").textContent = reward.title;
  document.getElementById("modal-desc").textContent = reward.desc;
  modal.hidden = false;
  if (reward.rarity === "legendary") flashScreen("legendary");
  else if (reward.rarity === "epic") flashScreen();
}

function pullCapsule() {
  if (state.stardust < pullCost) {
    showToast("Need " + formatNum(pullCost - state.stardust) + " more ✨");
    return;
  }
  state.stardust -= pullCost;
  state.pullCount++;
  pullCost = Math.floor(pullCost * 1.3 + 80);

  const machine = document.getElementById("capsule-machine");
  const preview = document.getElementById("capsule-preview");
  machine.classList.remove("drop");
  machine.classList.add("shake");
  preview.textContent = "…";
  playTone(200, 0.08, "square", 0.05);

  let shakes = 0;
  const shakeInt = setInterval(() => {
    playTone(250 + shakes * 40, 0.06, "sawtooth", 0.04);
    if (++shakes >= 3) clearInterval(shakeInt);
  }, 180);

  setTimeout(() => {
    machine.classList.remove("shake");
    machine.classList.add("drop");
    preview.textContent = "!";
    playTone(600, 0.15, "sine", 0.08);

    setTimeout(() => {
      machine.classList.remove("drop");
      preview.textContent = "?";
      const reward = weightedPull();
      reward.apply(state);
      showPullModal(reward);
      checkAchievements();
      markShopDirty();
      markEconomyDirty();
      renderOrbits();
      updateHUD();
      saveGame();
    }, 550);
  }, 600);
}

function saveGame() {
  state.lastSave = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem("cosmic-idle-v2") || localStorage.getItem("cosmic-idle-save");
    if (!raw) return;
    state = migrateState(JSON.parse(raw));

    const offlineMs = Date.now() - (state.lastSave || Date.now());
    const offlineSec = Math.min(offlineMs / 1000, 8 * 3600);
    if (offlineSec > 60) {
      const earned = getProduction() * offlineSec * 0.5;
      if (earned > 0) {
        state.stardust += earned;
        state.totalEarned += earned;
        setTimeout(() => showToast("Welcome back! +" + formatNum(earned) + " ✨"), 600);
      }
    }
    pullCost = Math.floor(100 * Math.pow(1.3, state.pullCount) + 80 * state.pullCount);
  } catch (_) {}
}

/* ── Particle system ── */
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");
let particles = [];
let activeParticlePalette = PARTICLE_PALETTES.default;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function burstParticles(x, y, count, emoji) {
  const colors = activeParticlePalette;
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10 - 4,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
      size: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      emoji: emoji && Math.random() < 0.3 ? emoji : null,
    });
  }
}

function tickParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter((p) => p.life > 0);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= p.decay;
    ctx.globalAlpha = p.life;
    if (p.emoji) {
      ctx.font = "14px sans-serif";
      ctx.fillText(p.emoji, p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function gameLoop(ts) {
  const dt = Math.min((ts - lastTick) / 1000, 0.1);
  lastTick = ts;

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }

  tickBuffs();
  const prod = getProduction();
  if (prod > 0) {
    state.stardust += prod * dt;
    state.totalEarned += prod * dt;
  }

  saveTimer += dt;
  if (saveTimer >= 20) { saveGame(); saveTimer = 0; }

  updateHUD();
  tickParticles();
  requestAnimationFrame(gameLoop);
}

document.getElementById("crystal").addEventListener("click", onCrystalClick);
document.getElementById("btn-pull").addEventListener("click", pullCapsule);
document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("pull-modal").hidden = true;
});
document.getElementById("pull-modal").addEventListener("click", (e) => {
  if (e.target.id === "pull-modal") document.getElementById("pull-modal").hidden = true;
});

document.getElementById("generator-shop").addEventListener("click", (e) => {
  const row = e.target.closest("[data-buy-gen]");
  if (row) buyGen(row.dataset.buyGen, row);
});

document.getElementById("upgrade-shop").addEventListener("click", (e) => {
  const row = e.target.closest("[data-buy-up]");
  if (row) buyUpgrade(row.dataset.buyUp, row);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveGame();
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* Gem drop from tapping — extremely rare, requires decent tap power */
const GEM_DROP_MIN_POWER = 30;
const GEM_DROP_CHANCE = 0.0008; /* 0.08% per tap when eligible */

function tryGemDrop(x, y) {
  if (getClickPower() < GEM_DROP_MIN_POWER) return;
  if (Math.random() > GEM_DROP_CHANCE) return;

  state.voidGems += 1;
  state.gemDropsFound = (state.gemDropsFound || 0) + 1;
  flashScreen("legendary");
  playTone(880, 0.12, "sine", 0.09);
  playTone(1320, 0.25, "sine", 0.07);

  const zone = document.getElementById("click-zone").getBoundingClientRect();
  spawnFloat(x - zone.left - 40, y - zone.top - 30, "💎 GEM!", "gem-drop");

  showToast("RARE DROP! +1 Void Gem 💎");
  checkAchievements();
  markEconomyDirty();
  saveGame();
}
