function defaultPets() {
  return {
    owned: ["pet_wisp"],
    active: "pet_wisp",
    levels: { pet_wisp: 1 },
    xp: { pet_wisp: 0 },
    gearOwned: [],
    gearEquipped: { pet_wisp: { collar: null, charm: null, aura: null } },
    arenaWins: 0,
    arenaWave: 1,
  };
}

function ensurePetState() {
  if (!state.pets) state.pets = defaultPets();
  if (!state.pets.gearEquipped) state.pets.gearEquipped = {};
  for (const pid of state.pets.owned) {
    if (!state.pets.levels[pid]) state.pets.levels[pid] = 1;
    if (state.pets.xp[pid] == null) state.pets.xp[pid] = 0;
    if (!state.pets.gearEquipped[pid]) {
      state.pets.gearEquipped[pid] = { collar: null, charm: null, aura: null };
    }
  }
  if (!state.pets.owned.includes(state.pets.active)) {
    state.pets.active = state.pets.owned[0];
  }
}

function ownsPet(id) {
  return state.pets.owned.includes(id);
}

function ownsGear(id) {
  return state.pets.gearOwned.includes(id);
}

function getPetLevel(id) {
  return state.pets.levels[id] || 1;
}

function getPetStats(petId) {
  const species = getPetSpecies(petId);
  if (!species) return { atk: 1, def: 1, hp: 10 };
  const lv = getPetLevel(petId);
  const scale = 1 + (lv - 1) * 0.12;
  let atk = Math.floor(species.base.atk * scale);
  let def = Math.floor(species.base.def * scale);
  let hp = Math.floor(species.base.hp * scale);

  const eq = state.pets.gearEquipped[petId] || {};
  for (const slot of ["collar", "charm", "aura"]) {
    const gid = eq[slot];
    if (!gid) continue;
    const gear = getPetGear(gid);
    if (!gear?.stats) continue;
    atk += gear.stats.atk || 0;
    def += gear.stats.def || 0;
    hp += gear.stats.hp || 0;
  }
  return { atk, def, hp };
}

function hatchPet(species) {
  if (ownsPet(species.id)) {
    showToast("Already have " + species.name + "!");
    return;
  }
  if (species.currency === "free") {
    /* already have wisp */
    return;
  }
  if (!spendCurrency(species)) {
    showToast(affordHint(species));
    playTone(180, 0.1, "sawtooth", 0.05);
    return;
  }
  state.pets.owned.push(species.id);
  state.pets.levels[species.id] = 1;
  state.pets.xp[species.id] = 0;
  state.pets.gearEquipped[species.id] = { collar: null, charm: null, aura: null };
  playTone(440, 0.15, "sine", 0.07);
  showToast("Hatched " + species.name + "! " + species.icon);
  checkAchievements();
  markPetsDirty();
  saveGame();
}

function buyLimitedShopItem(item) {
  if (item.type === "pet" && item.petSpecies) {
    const species = getPetSpecies(item.petSpecies);
    if (ownsPet(item.petSpecies)) { showToast("Already owned!"); return; }
    if (!isLimitedAvailable(item)) { showToast("Event ended — missed forever!"); return; }
    if (!spendCurrency(item)) {
      showToast(affordHint(item));
      playTone(180, 0.1, "sawtooth", 0.05);
      return;
    }
    state.pets.owned.push(item.petSpecies);
    state.pets.levels[item.petSpecies] = 1;
    state.pets.xp[item.petSpecies] = 0;
    state.pets.gearEquipped[item.petSpecies] = { collar: null, charm: null, aura: null };
    showToast("Hatched " + species.name + " — yours forever! " + species.icon);
  } else if (item.type === "pet_gear" && item.gearId) {
    if (ownsGear(item.gearId)) { showToast("Already owned!"); return; }
    if (!isLimitedAvailable(item)) { showToast("Event ended!"); return; }
    if (!spendCurrency(item)) {
      showToast(affordHint(item));
      playTone(180, 0.1, "sawtooth", 0.05);
      return;
    }
    state.pets.gearOwned.push(item.gearId);
    showToast("Unlocked gear forever: " + getPetGear(item.gearId).name);
  } else {
    buyCosmetic(item);
    return;
  }
  checkAchievements();
  markShopDirty();
  markEconomyDirty();
  markPetsDirty();
  updateHUD();
  saveGame();
}

function buyPetGear(gear) {
  if (ownsGear(gear.id)) { showToast("Already owned!"); return; }
  if (!canAffordItem(gear)) {
    showToast(affordHint(gear));
    playTone(180, 0.1, "sawtooth", 0.05);
    return;
  }
  spendCurrency(gear);
  state.pets.gearOwned.push(gear.id);
  showToast("Bought " + gear.name + "!");
  markShopDirty();
  markEconomyDirty();
  markPetsDirty();
  updateHUD();
  saveGame();
}

function equipPetGear(gearId) {
  const gear = getPetGear(gearId);
  if (!gear || !ownsGear(gearId)) return;
  const petId = state.pets.active;
  state.pets.gearEquipped[petId][gear.slot] = gearId;
  showToast("Equipped " + gear.name + " on " + getPetSpecies(petId).name);
  markPetsDirty();
  saveGame();
}

function unequipPetGear(slot) {
  const petId = state.pets.active;
  state.pets.gearEquipped[petId][slot] = null;
  markPetsDirty();
  saveGame();
}

function setActivePet(petId) {
  if (!ownsPet(petId)) return;
  state.pets.active = petId;
  markPetsDirty();
  saveGame();
}

function addPetXp(petId, amount) {
  state.pets.xp[petId] = (state.pets.xp[petId] || 0) + amount;
  const xp = state.pets.xp[petId];
  const newLv = Math.min(50, Math.floor(xp / 80) + 1);
  const oldLv = getPetLevel(petId);
  if (newLv > oldLv) {
    state.pets.levels[petId] = newLv;
    showToast(getPetSpecies(petId).name + " reached Lv." + newLv + "! ⬆");
    playTone(660, 0.2, "sine", 0.08);
  }
}

function getEnemyForWave(wave) {
  const tmpl = ARENA_ENEMIES[(wave - 1) % ARENA_ENEMIES.length];
  const tier = Math.floor((wave - 1) / ARENA_ENEMIES.length);
  const mult = tmpl.scale * (1 + tier * 0.4);
  return {
    name: tmpl.name + (tier > 0 ? " +" + tier : ""),
    icon: tmpl.icon,
    atk: Math.floor((8 + wave * 3) * mult),
    def: Math.floor((4 + wave * 2) * mult),
    hp: Math.floor((40 + wave * 14) * mult),
    maxHp: Math.floor((40 + wave * 14) * mult),
  };
}

let arenaRunning = false;

function runArenaFight() {
  if (arenaRunning) return;
  const petId = state.pets.active;
  const species = getPetSpecies(petId);
  const stats = getPetStats(petId);
  const enemy = getEnemyForWave(state.pets.arenaWave);

  let petHp = stats.hp;
  let enemyHp = enemy.maxHp;
  arenaRunning = true;
  document.getElementById("btn-arena-fight").disabled = true;

  const log = document.getElementById("arena-log");
  log.innerHTML = "";
  addArenaLog("⚔ " + species.icon + " " + species.name + " vs " + enemy.icon + " " + enemy.name);

  const petFighter = document.getElementById("arena-pet");
  const enemyFighter = document.getElementById("arena-enemy");
  petFighter.querySelector(".fighter-icon").textContent = species.icon;
  petFighter.querySelector(".fighter-name").textContent = species.name + " Lv." + getPetLevel(petId);
  enemyFighter.querySelector(".fighter-icon").textContent = enemy.icon;
  enemyFighter.querySelector(".fighter-name").textContent = enemy.name;

  let turn = 0;
  const interval = setInterval(() => {
    turn++;
    if (turn % 2 === 1) {
      const dmg = Math.max(1, Math.floor(stats.atk - enemy.def * 0.35));
      enemyHp -= dmg;
      addArenaLog(species.icon + " hits for " + dmg + "!");
      enemyFighter.classList.add("hit");
      setTimeout(() => enemyFighter.classList.remove("hit"), 200);
    } else {
      const dmg = Math.max(1, Math.floor(enemy.atk - stats.def * 0.35));
      petHp -= dmg;
      addArenaLog(enemy.icon + " hits for " + dmg + "!");
      petFighter.classList.add("hit");
      setTimeout(() => petFighter.classList.remove("hit"), 200);
    }

    updateArenaHp(petHp, stats.hp, enemyHp, enemy.maxHp);

    if (enemyHp <= 0 || petHp <= 0) {
      clearInterval(interval);
      finishArena(petHp > 0, petId, enemy);
    }
  }, 650);
}

function updateArenaHp(petHp, petMax, enemyHp, enemyMax) {
  document.getElementById("pet-hp-bar").style.width = Math.max(0, (petHp / petMax) * 100) + "%";
  document.getElementById("enemy-hp-bar").style.width = Math.max(0, (enemyHp / enemyMax) * 100) + "%";
}

function addArenaLog(text) {
  const log = document.getElementById("arena-log");
  const line = document.createElement("div");
  line.className = "arena-log-line";
  line.textContent = text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function finishArena(won, petId, enemy) {
  arenaRunning = false;
  document.getElementById("btn-arena-fight").disabled = false;

  if (won) {
    state.pets.arenaWins++;
    state.pets.arenaWave++;
    const stardust = Math.floor(50 + state.pets.arenaWins * 25 + state.pets.arenaWave * 10);
    state.stardust += stardust;
    addPetXp(petId, 40 + state.pets.arenaWins * 5);
    addArenaLog("🏆 VICTORY! +" + formatNum(stardust) + " ✨");
    if (Math.random() < 0.04) {
      state.voidGems += 1;
      addArenaLog("💎 Bonus Void Gem!");
    }
    flashScreen();
    playTone(880, 0.2, "sine", 0.08);
    checkAchievements();
  } else {
    addArenaLog("💀 Defeated... train harder and try again!");
    playTone(200, 0.2, "sawtooth", 0.05);
  }
  markShopDirty();
  markPetsDirty();
  updateHUD();
  saveGame();
}

function claimCollectibleMedal(medal) {
  if (ownsCollectibleMedal(medal.id)) { showToast("Already in your collection!"); return; }
  if (medal.availableUntil && Date.now() >= new Date(medal.availableUntil).getTime()) {
    showToast("Claim period ended.");
    return;
  }
  state.inventory.medals.push(medal.id);
  flashScreen("legendary");
  playTone(523, 0.15, "sine", 0.08);
  showToast("Medal added to collection: " + medal.name + " 🎖");
  markEconomyDirty();
  saveGame();
}

let petsDirty = true;

function markPetsDirty() {
  petsDirty = true;
  markEconomyDirty();
}

function renderPetsView() {
  ensurePetState();
  const active = state.pets.active;
  const species = getPetSpecies(active);
  const stats = getPetStats(active);

  document.getElementById("pet-active-icon").textContent = species.icon;
  document.getElementById("pet-active-name").textContent = species.name;
  document.getElementById("pet-active-lv").textContent = "Lv." + getPetLevel(active);
  document.getElementById("pet-stat-atk").textContent = stats.atk;
  document.getElementById("pet-stat-def").textContent = stats.def;
  document.getElementById("pet-stat-hp").textContent = stats.hp;
  document.getElementById("arena-wave").textContent = state.pets.arenaWave;
  document.getElementById("arena-wins").textContent = state.pets.arenaWins;

  const roster = document.getElementById("pet-roster");
  roster.innerHTML = "";
  for (const pid of state.pets.owned) {
    const sp = getPetSpecies(pid);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pet-chip" + (pid === active ? " active" : "");
    btn.textContent = sp.icon + " " + sp.name;
    btn.addEventListener("click", () => setActivePet(pid));
    roster.appendChild(btn);
  }

  const slots = document.getElementById("pet-gear-slots");
  slots.innerHTML = "";
  const eq = state.pets.gearEquipped[active] || {};
  for (const slot of ["collar", "charm", "aura"]) {
    const gid = eq[slot];
    const gear = gid ? getPetGear(gid) : null;
    const el = document.createElement("div");
    el.className = "gear-slot";
    el.innerHTML =
      '<span class="gear-slot-label">' + slot + '</span>' +
      '<span class="gear-slot-item">' + (gear ? gear.icon + " " + gear.name : "— empty —") + '</span>' +
      (gear ? '<button type="button" class="btn-unequip" data-unequip="' + slot + '">×</button>' : "");
    slots.appendChild(el);
  }
  slots.querySelectorAll("[data-unequip]").forEach((b) => {
    b.addEventListener("click", () => unequipPetGear(b.dataset.unequip));
  });

  const ownedGear = document.getElementById("pet-owned-gear");
  ownedGear.innerHTML = "";
  if (!state.pets.gearOwned.length) {
    ownedGear.innerHTML = '<p class="empty-msg">No gear yet — buy from Shop or limited events</p>';
  } else {
    for (const gid of state.pets.gearOwned) {
      const g = getPetGear(gid);
      const row = document.createElement("div");
      row.className = "eco-card inv-card";
      row.innerHTML =
        '<div class="eco-preview">' + g.icon + '</div>' +
        '<div class="eco-info"><div class="eco-name">' + g.name + '</div>' +
        '<div class="eco-desc">' + g.desc + ' · ' + g.slot + '</div></div>' +
        '<button type="button" class="btn btn-equip" data-equip-gear="' + g.id + '">Equip</button>';
      ownedGear.appendChild(row);
    }
  }

  const hatch = document.getElementById("pet-hatch-list");
  hatch.innerHTML = "";
  for (const sp of getShopPetSpecies()) {
    if (ownsPet(sp.id)) continue;
    const row = document.createElement("div");
    row.className = "eco-card can-buy";
    row.innerHTML =
      '<div class="eco-preview">' + sp.icon + '</div>' +
      '<div class="eco-info"><div class="eco-name">' + sp.name + '</div>' +
      '<div class="eco-desc">' + sp.desc + '</div></div>' +
      '<button type="button" class="btn btn-buy" data-hatch="' + sp.id + '">' + formatPrice(sp) + '</button>';
    hatch.appendChild(row);
  }

  const preview = getEnemyForWave(state.pets.arenaWave);
  document.getElementById("arena-preview").textContent =
    "Next: " + preview.icon + " " + preview.name + " (ATK " + preview.atk + ")";

  petsDirty = false;
}

function initPetsUI() {
  document.getElementById("btn-arena-fight").addEventListener("click", runArenaFight);

  document.getElementById("pet-owned-gear").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-equip-gear]");
    if (btn) equipPetGear(btn.dataset.equipGear);
  });

  document.getElementById("pet-hatch-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-hatch]");
    if (btn) {
      const sp = getPetSpecies(btn.dataset.hatch);
      if (sp) hatchPet(sp);
    }
  });
}

function bootGame() {
  loadGame();
  ensurePetState();
  applyCosmetics();
  renderOrbits();
  initEconomyUI();
  initPetsUI();
  markShopDirty();
  markEconomyDirty();
  markPetsDirty();
  updateHUD();
  requestAnimationFrame(gameLoop);
  checkAchievements();
}

bootGame();
