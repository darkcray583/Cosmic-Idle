function formatPrice(item) {
  if (item.currency === "free") return "Free";
  if (item.currency === "stardust") return formatNum(item.price) + " ✨";
  if (item.currency === "gems") return item.price + " 💎";
  return "";
}

function defaultInventory() {
  return {
    owned: [...STARTER_OWNED],
    equipped: { ...DEFAULT_EQUIPPED },
    medals: [],
    achievements: [],
  };
}

function migrateState(raw) {
  const base = defaultState();
  const merged = { ...base, ...raw };
  if (!merged.inventory) merged.inventory = defaultInventory();
  if (!merged.inventory.equipped) merged.inventory.equipped = { ...DEFAULT_EQUIPPED };
  if (!merged.inventory.owned) merged.inventory.owned = [...STARTER_OWNED];
  if (!merged.inventory.medals) merged.inventory.medals = [];
  if (!merged.inventory.achievements) merged.inventory.achievements = [];
  /* Move old achievement ids out of medals into achievements */
  const cleanedMedals = [];
  for (const id of merged.inventory.medals) {
    if (id === "medal_launch_2026") {
      cleanedMedals.push(id);
      continue;
    }
    if (id.startsWith("medal_")) {
      const mapped = "ach_" + id.slice(6);
      if (ACHIEVEMENT_IDS.has(mapped) && !merged.inventory.achievements.includes(mapped)) {
        merged.inventory.achievements.push(mapped);
      } else if (ACHIEVEMENT_IDS.has(id) && !merged.inventory.achievements.includes(id)) {
        merged.inventory.achievements.push(id);
      }
      continue;
    }
    if (ACHIEVEMENT_IDS.has(id) && !merged.inventory.achievements.includes(id)) {
      merged.inventory.achievements.push(id);
      continue;
    }
    cleanedMedals.push(id);
  }
  merged.inventory.medals = cleanedMedals;
  if (merged.voidGems == null) merged.voidGems = 0;
  if (merged.gemsSpent == null) merged.gemsSpent = 0;
  if (merged.maxComboMult == null) merged.maxComboMult = 1;
  if (!merged.pets) merged.pets = defaultPets();
  for (const id of STARTER_OWNED) {
    if (!merged.inventory.owned.includes(id)) merged.inventory.owned.push(id);
  }
  return merged;
}

function ownsCollectibleMedal(id) {
  return state.inventory.medals.includes(id);
}

function ownsAchievement(id) {
  return state.inventory.achievements.includes(id);
}

function ownsItem(id) {
  return state.inventory.owned.includes(id);
}

function canAffordItem(item) {
  if (!item || item.currency === "free") return true;
  if (item.currency === "stardust") return state.stardust >= item.price;
  if (item.currency === "gems") return state.voidGems >= item.price;
  return false;
}

function affordHint(item) {
  if (item.currency === "stardust") {
    const need = item.price - state.stardust;
    return need > 0 ? "Need " + formatNum(need) + " more ✨" : "";
  }
  if (item.currency === "gems") {
    const need = item.price - state.voidGems;
    return need > 0 ? "Need " + need + " more 💎" : "";
  }
  return "Can't afford this";
}

function getShopItem(id) {
  const cos = getCosmeticById(id);
  if (cos) return cos;
  const lim = LIMITED_ITEMS.find((i) => i.id === id);
  if (lim) return lim;
  const pet = getPetSpecies(id);
  if (pet && pet.price > 0 && pet.currency !== "limited") {
    return { ...pet, type: "pet_hatch", petSpecies: pet.id };
  }
  const gear = getPetGear(id);
  if (gear && gear.currency !== "limited") {
    return { ...gear, type: "pet_gear_shop", gearId: gear.id };
  }
  return null;
}

function isShopItemOwned(item) {
  if (!item) return false;
  if (item.type === "pet_hatch" || item.type === "pet") return ownsPet(item.petSpecies || item.id);
  if (item.type === "pet_gear_shop" || item.type === "pet_gear") return ownsGear(item.gearId || item.id);
  return ownsItem(item.id);
}

function purchaseShopItem(id) {
  const item = getShopItem(id);
  if (!item) {
    showToast("Item not found");
    return;
  }
  if (isShopItemOwned(item)) {
    showToast("Already owned!");
    return;
  }
  if (item.availableUntil && !isLimitedAvailable(item)) {
    showToast("Event ended — this item is gone forever!");
    return;
  }
  if (item.type === "pet_hatch" && item.petSpecies) {
    hatchPet(getPetSpecies(item.petSpecies));
    return;
  }
  if (item.type === "pet" || item.type === "pet_gear") {
    buyLimitedShopItem(item);
    return;
  }
  if (item.type === "pet_gear_shop") {
    if (!canAffordItem(item)) {
      showToast(affordHint(item));
      playTone(180, 0.1, "sawtooth", 0.05);
      return;
    }
    buyPetGear(getPetGear(item.gearId));
    return;
  }
  if (!canAffordItem(item)) {
    showToast(affordHint(item));
    playTone(180, 0.1, "sawtooth", 0.05);
    return;
  }
  buyCosmetic(item);
}

function spendCurrency(item) {
  if (item.currency === "stardust") {
    if (state.stardust < item.price) return false;
    state.stardust -= item.price;
    return true;
  }
  if (item.currency === "gems") {
    if (state.voidGems < item.price) return false;
    state.voidGems -= item.price;
    state.gemsSpent = (state.gemsSpent || 0) + item.price;
    return true;
  }
  return item.currency === "free";
}

function buyCosmetic(item) {
  if (ownsItem(item.id)) {
    showToast("Already owned!");
    return;
  }
  if (item.availableUntil && !isLimitedAvailable(item)) {
    showToast("This item expired!");
    return;
  }
  if (!spendCurrency(item)) {
    showToast(affordHint(item));
    playTone(180, 0.1, "sawtooth", 0.05);
    return;
  }
  state.inventory.owned.push(item.id);
  playTone(660, 0.12, "sine", 0.07);
  playTone(880, 0.2, "sine", 0.06);
  flashScreen(item.rarity === "legendary" ? "legendary" : "");
  showToast("Unlocked: " + item.name + "! 🎉");
  checkAchievements();
  markShopDirty();
  markEconomyDirty();
  updateHUD();
  saveGame();
}

function equipCosmetic(id) {
  const item = getCosmeticById(id);
  if (!item || !ownsItem(id)) return;
  state.inventory.equipped[item.type] = id;
  applyCosmetics();
  playTone(520, 0.08, "sine", 0.05);
  showToast("Equipped " + item.name);
  markEconomyDirty();
  updateHUD();
  saveGame();
}

function buyGemExchange(pack) {
  if (state.stardust < pack.stardust) {
    showToast("Need " + formatNum(pack.stardust - state.stardust) + " more ✨");
    return;
  }
  state.stardust -= pack.stardust;
  let grant = pack.gems;
  if (pack.id === "ex_50") grant += 5;
  if (pack.id === "ex_200") grant += 30;
  state.voidGems += grant;
  playTone(784, 0.15, "sine", 0.07);
  showToast("+" + grant + " Void Gems 💎");
  markShopDirty();
  markEconomyDirty();
  updateHUD();
  saveGame();
}

function buyRealMoneyPackage(pack) {
  const modal = document.getElementById("iap-modal");
  document.getElementById("iap-pack-name").textContent = pack.tag + " — " + pack.gems + " Gems";
  document.getElementById("iap-pack-price").textContent = pack.label;
  document.getElementById("iap-pack-bonus").textContent = pack.bonus || "";
  modal.dataset.packId = pack.id;
  modal.hidden = false;
}

function confirmDemoPurchase() {
  const modal = document.getElementById("iap-modal");
  const pack = REAL_MONEY_PACKAGES.find((p) => p.id === modal.dataset.packId);
  if (!pack) return;
  modal.hidden = true;
  let grant = pack.gems;
  if (pack.id === "iap_420") grant += 20;
  if (pack.id === "iap_900") grant += 100;
  if (pack.id === "iap_2000") grant += 300;
  state.voidGems += grant;
  playTone(523, 0.1, "sine", 0.08);
  playTone(1046, 0.25, "sine", 0.06);
  flashScreen("legendary");
  showToast("Demo purchase: +" + grant + " 💎 (connect Stripe for real $)");
  markEconomyDirty();
  updateHUD();
  saveGame();
}

function checkAchievements() {
  let fresh = false;
  for (const a of ACHIEVEMENTS) {
    if (ownsAchievement(a.id)) continue;
    if (a.check(state)) {
      state.inventory.achievements.push(a.id);
      fresh = true;
      showToast("Achievement unlocked: " + a.name + " " + a.icon);
      playTone(880, 0.2, "sine", 0.08);
    }
  }
  if (fresh) markEconomyDirty();
}

function applyCosmetics() {
  const eq = state.inventory.equipped;
  const crystal = getCosmeticById(eq.crystal);
  const nebula = getCosmeticById(eq.nebula);
  const trail = getCosmeticById(eq.trail);
  const title = getCosmeticById(eq.title);

  const crystalEl = document.getElementById("crystal");
  crystalEl.className = "crystal " + (crystal?.skin || "skin-default");

  const nebulaEl = document.getElementById("nebula-bg");
  nebulaEl.className = "nebula " + (nebula?.skin || "nebula-default");

  const ring = document.getElementById("orbit-ring");
  ring.className = "orbit-ring " + (trail?.skin || "trail-none");

  const titleEl = document.getElementById("player-title");
  titleEl.textContent = title?.label || "";

  activeParticlePalette = PARTICLE_PALETTES[getCosmeticById(eq.particles)?.palette || "default"];
}

function getEquippedLabel(type) {
  const id = state.inventory.equipped[type];
  const item = getCosmeticById(id);
  return item ? item.name : "None";
}

let economyDirty = true;
let lastEconomyKey = "";
let lastAffordEconomy = "";
let activeView = "play";
let cosShopFilter = "all";

function markEconomyDirty() {
  economyDirty = true;
}

function economyStructureKey() {
  return [
    cosShopFilter,
    activeView,
    state.inventory.owned.length,
    state.inventory.medals.length,
    state.inventory.achievements.length,
    state.pets.owned.length,
    state.pets.gearOwned.length,
    JSON.stringify(state.inventory.equipped),
    LIMITED_ITEMS.map((i) => i.id + (isLimitedAvailable(i) ? 1 : 0)).join(","),
    document.querySelector(".inv-tab.active")?.dataset.invTab || "items",
  ].join("|");
}

function economyAffordKey() {
  return Math.floor(state.stardust) + "|" + state.voidGems;
}

function updateCosShopAffordability() {
  const key = economyAffordKey();
  if (key === lastAffordEconomy) return;
  lastAffordEconomy = key;

  document.querySelectorAll("#cos-shop-list .shop-row").forEach((row) => {
    const item = getShopItem(row.dataset.shopId);
    if (!item || isShopItemOwned(item)) return;
    const can = canAffordItem(item);
    row.classList.toggle("can-buy", can);
    row.classList.toggle("locked", !can);
  });

  document.querySelectorAll("#exchange-list .shop-row").forEach((row) => {
    const pack = GEM_EXCHANGE.find((p) => p.id === row.dataset.exGem);
    if (!pack) return;
    row.classList.toggle("can-buy", state.stardust >= pack.stardust);
    row.classList.toggle("locked", state.stardust < pack.stardust);
  });
}

function switchView(view) {
  activeView = view;
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("view-active"));
  document.getElementById("view-" + view).classList.add("view-active");
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
  });
  markEconomyDirty();
  if (view !== "play") renderEconomyPanels();
}

function renderEconomyIfNeeded() {
  if (activeView === "play") return;
  if (activeView === "pets" && petsDirty) {
    renderPetsView();
    return;
  }
  const struct = economyStructureKey();
  if (economyDirty || struct !== lastEconomyKey) {
    economyDirty = false;
    lastEconomyKey = struct;
    renderEconomyPanels();
    lastAffordEconomy = economyAffordKey();
    return;
  }
  updateCosShopAffordability();
}

function renderEconomyPanels() {
  if (activeView === "cos-shop") renderCosShop();
  if (activeView === "inventory") renderInventory();
  if (activeView === "gems") renderGemStore();
  if (activeView === "pets") renderPetsView();
}

function buildShopSections() {
  if (cosShopFilter === "limited") {
    return [{ title: "⏳ Limited Event — buy now, keep forever", items: LIMITED_ITEMS.filter(isLimitedAvailable) }];
  }
  if (cosShopFilter === "pets") {
    const pets = getShopPetSpecies().map((sp) => ({
      id: sp.id, name: sp.name, icon: sp.icon, desc: sp.desc,
      rarity: sp.rarity, price: sp.price, currency: sp.currency,
      type: "pet_hatch", petSpecies: sp.id,
    }));
    const gear = PET_GEAR.filter((g) => g.currency !== "limited").map((g) => ({
      id: g.id, name: g.name, icon: g.icon, desc: g.desc,
      rarity: g.rarity, price: g.price, currency: g.currency,
      type: "pet_gear_shop", gearId: g.id,
    }));
    return [
      { title: "🐾 Hatch Voidlings", items: pets },
      { title: "⚔ Pet Gear", items: gear },
    ];
  }
  if (cosShopFilter !== "all") {
    return [{
      title: cosShopFilter.charAt(0).toUpperCase() + cosShopFilter.slice(1) + "s",
      items: COSMETICS.filter((i) => i.type === cosShopFilter && i.price > 0),
    }];
  }
  return [
    { title: "⏳ Limited Event", items: LIMITED_ITEMS.filter(isLimitedAvailable) },
    { title: "◇ Crystals", items: COSMETICS.filter((i) => i.type === "crystal" && i.price > 0) },
    { title: "🌌 Skies", items: COSMETICS.filter((i) => i.type === "nebula" && i.price > 0) },
    { title: "✨ Particles", items: COSMETICS.filter((i) => i.type === "particles" && i.price > 0) },
    { title: "📛 Titles", items: COSMETICS.filter((i) => i.type === "title" && i.price > 0) },
    { title: "☄ Trails", items: COSMETICS.filter((i) => i.type === "trail" && i.price > 0) },
    { title: "🐾 Voidlings", items: getShopPetSpecies().map((sp) => ({
      id: sp.id, name: sp.name, icon: sp.icon, desc: sp.desc,
      rarity: sp.rarity, price: sp.price, currency: sp.currency,
      type: "pet_hatch", petSpecies: sp.id,
    })) },
    { title: "⚔ Pet Gear", items: PET_GEAR.filter((g) => g.currency !== "limited").map((g) => ({
      id: g.id, name: g.name, icon: g.icon, desc: g.desc,
      rarity: g.rarity, price: g.price, currency: g.currency,
      type: "pet_gear_shop", gearId: g.id,
    })) },
  ].filter((s) => s.items.length > 0);
}

function appendShopRow(container, item) {
  const owned = isShopItemOwned(item);
  const can = canAffordItem(item);
  const timer = item.availableUntil ? limitedTimeLeft(item) : "";
  const row = document.createElement("div");
  row.className = "shop-row eco-card" + (owned ? " owned" : can ? " can-buy" : " locked");
  row.dataset.shopId = item.id;
  if (!owned) row.dataset.action = "buy";
  row.innerHTML =
    '<div class="eco-preview rarity-' + (item.rarity || "common") + '">' + item.icon + '</div>' +
    '<div class="eco-info">' +
    '<div class="eco-name">' + item.name +
    (item.rarity ? ' <span class="rarity-tag" style="color:' + RARITY_COLORS[item.rarity] + '">' + item.rarity + '</span>' : '') +
    '</div><div class="eco-desc">' + item.desc + '</div>' +
    (timer ? '<div class="eco-timer">⏳ ' + timer + ' to buy · KEEP FOREVER</div>' : '') +
    (item.forever && !timer ? '<div class="eco-forever">★ Permanent once owned</div>' : '') +
    '</div><div class="eco-action">' +
    (owned ? '<span class="owned-badge">Owned</span>' :
      '<span class="shop-price-tag">' + formatPrice(item) + '</span>') +
    '</div>';
  container.appendChild(row);
}

function renderCosShop() {
  const el = document.getElementById("cos-shop-list");
  el.innerHTML = "";

  document.querySelectorAll("#cos-filters .filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === cosShopFilter);
  });

  const sections = buildShopSections();
  let any = false;
  for (const sec of sections) {
    if (!sec.items.length) continue;
    any = true;
    const head = document.createElement("h3");
    head.className = "shop-section-title";
    head.textContent = sec.title;
    el.appendChild(head);
    for (const item of sec.items) appendShopRow(el, item);
  }
  if (!any) el.innerHTML = '<p class="empty-msg">Nothing in this category right now.</p>';
  lastAffordEconomy = "";
  updateCosShopAffordability();
}

function renderInventory() {
  document.getElementById("inv-gems").textContent = state.voidGems;
  document.getElementById("inv-owned-count").textContent = state.inventory.owned.length;
  document.getElementById("inv-medal-count").textContent = state.inventory.medals.length;
  const achEl = document.getElementById("inv-ach-count");
  if (achEl) achEl.textContent = state.inventory.achievements.length + "/" + ACHIEVEMENTS.length;

  const loadout = document.getElementById("loadout-slots");
  loadout.innerHTML = "";
  for (const type of ["crystal", "nebula", "particles", "title", "trail"]) {
    const item = getCosmeticById(state.inventory.equipped[type]);
    const slot = document.createElement("div");
    slot.className = "loadout-slot";
    slot.innerHTML =
      '<span class="loadout-type">' + type + '</span>' +
      '<span class="loadout-icon">' + (item?.icon || "—") + '</span>' +
      '<span class="loadout-name">' + (item?.name || "None") + '</span>';
    loadout.appendChild(slot);
  }

  const tab = document.querySelector(".inv-tab.active")?.dataset.invTab || "items";
  const grid = document.getElementById("inv-grid");
  grid.innerHTML = "";

  if (tab === "items") {
    const types = ["crystal", "nebula", "particles", "title", "trail"];
    for (const type of types) {
      const items = state.inventory.owned.map(getCosmeticById).filter((i) => i && i.type === type);
      if (!items.length) continue;
      const head = document.createElement("h3");
      head.className = "shop-section-title";
      head.textContent = type.charAt(0).toUpperCase() + type.slice(1) + "s";
      grid.appendChild(head);
      const wrap = document.createElement("div");
      wrap.className = "inv-item-grid";
      for (const item of items) wrap.appendChild(makeInvCard(item));
      grid.appendChild(wrap);
    }
    if (!grid.children.length) {
      grid.innerHTML = '<p class="empty-msg">No cosmetics yet — visit the Shop!</p>';
    }
  } else if (tab === "medals") {
    const caseEl = document.createElement("div");
    caseEl.className = "medal-case";
    for (const m of COLLECTIBLE_MEDALS) {
      const earned = ownsCollectibleMedal(m.id);
      const canClaim = !earned && isLimitedAvailable(m);
      const tile = document.createElement("div");
      tile.className = "medal-tile ribbon-" + (m.ribbon || "gold") + (earned ? " earned" : " locked");
      tile.innerHTML =
        '<div class="medal-circle"><span class="medal-star">★</span></div>' +
        '<div class="medal-ribbon"></div>' +
        '<p class="medal-name">' + m.name + '</p>' +
        '<p class="medal-sub">' + (m.subtitle || "") + '</p>' +
        (earned ? '<span class="medal-status">In collection</span>' :
          canClaim ? '<button type="button" class="btn-medal-claim" data-claim-medal="' + m.id + '">Claim free</button>' :
          '<span class="medal-status dim">Unavailable</span>');
      caseEl.appendChild(tile);
    }
    grid.appendChild(caseEl);
    const hint = document.createElement("p");
    hint.className = "view-sub";
    hint.textContent = "Medals are collectible keepsakes — not achievements. Once claimed, they're yours forever.";
    grid.appendChild(hint);
  } else if (tab === "achievements") {
    for (const a of ACHIEVEMENTS) {
      const done = ownsAchievement(a.id);
      const card = document.createElement("div");
      card.className = "ach-card" + (done ? " done" : "");
      card.innerHTML =
        '<span class="ach-icon">' + (done ? a.icon : "?") + '</span>' +
        '<div class="ach-info"><div class="ach-name">' + a.name + '</div>' +
        '<div class="ach-desc">' + a.desc + '</div></div>' +
        (done ? '<span class="ach-check">✓</span>' : '<span class="ach-lock">🔒</span>');
      grid.appendChild(card);
    }
  } else if (tab === "event") {
    const ownedLimited = state.inventory.owned.map(getCosmeticById).filter((i) => i && i.availableUntil);
    const ownedPets = state.pets.owned.map(getPetSpecies).filter((p) => p && p.rarity === "limited");
    const ownedGear = state.pets.gearOwned.map(getPetGear).filter((g) => g && g.rarity === "limited");
    if (!ownedLimited.length && !ownedPets.length && !ownedGear.length) {
      grid.innerHTML = '<p class="empty-msg">No event exclusives yet. Grab them in Shop → Limited before time runs out!</p>';
    } else {
      const wrap = document.createElement("div");
      wrap.className = "inv-item-grid";
      for (const item of ownedLimited) wrap.appendChild(makeInvCard(item, true));
      for (const p of ownedPets) {
        const card = document.createElement("div");
        card.className = "eco-card inv-card";
        card.innerHTML = '<div class="eco-preview rarity-limited">' + p.icon + '</div>' +
          '<div class="eco-info"><div class="eco-name">' + p.name + '</div><div class="eco-desc">Voidling · forever</div></div>';
        wrap.appendChild(card);
      }
      for (const g of ownedGear) {
        const card = document.createElement("div");
        card.className = "eco-card inv-card";
        card.innerHTML = '<div class="eco-preview rarity-limited">' + g.icon + '</div>' +
          '<div class="eco-info"><div class="eco-name">' + g.name + '</div><div class="eco-desc">Pet gear · forever</div></div>';
        wrap.appendChild(card);
      }
      grid.appendChild(wrap);
    }
  }
}

function makeInvCard(item, showExpiry) {
  const equipped = state.inventory.equipped[item.type] === item.id;
  const card = document.createElement("div");
  card.className = "eco-card inv-card" + (equipped ? " equipped" : "");
  const timer = showExpiry && item.availableUntil ? limitedTimeLeft(item) : "";
  card.innerHTML =
    '<div class="eco-preview rarity-' + item.rarity + '">' + item.icon + '</div>' +
    '<div class="eco-info"><div class="eco-name">' + item.name + '</div>' +
    '<div class="eco-desc">' + item.type + (timer ? " · " + timer : "") + '</div></div>' +
    (equipped
      ? '<span class="equipped-badge">Equipped</span>'
      : '<button type="button" class="btn btn-equip" data-equip="' + item.id + '">Equip</button>');
  return card;
}

function renderGemStore() {
  document.getElementById("gem-balance").textContent = state.voidGems;

  const exEl = document.getElementById("exchange-list");
  exEl.innerHTML = "";
  for (const pack of GEM_EXCHANGE) {
    const can = state.stardust >= pack.stardust;
    const row = document.createElement("div");
    row.className = "shop-row eco-card" + (can ? " can-buy" : " locked");
    row.dataset.exGem = pack.id;
    row.dataset.action = "exchange";
    row.innerHTML =
      '<div class="eco-preview">💎</div>' +
      '<div class="eco-info"><div class="eco-name">' + pack.gems + ' Void Gems</div>' +
      '<div class="eco-desc">' + pack.label + (pack.bonus ? " · " + pack.bonus : "") + '</div></div>' +
      '<span class="shop-price-tag">' + formatNum(pack.stardust) + ' ✨</span>';
    exEl.appendChild(row);
  }

  const iapEl = document.getElementById("iap-list");
  iapEl.innerHTML = "";
  for (const pack of REAL_MONEY_PACKAGES) {
    const row = document.createElement("div");
    row.className = "eco-card iap-card can-buy";
    row.innerHTML =
      '<div class="eco-preview iap-gem">💎</div>' +
      '<div class="eco-info"><div class="eco-name">' + pack.gems + ' Void Gems' +
      (pack.tag ? ' <span class="iap-tag">' + pack.tag + '</span>' : "") + '</div>' +
      '<div class="eco-desc">' + (pack.bonus || "Instant delivery") + '</div></div>' +
      '<button type="button" class="btn btn-iap" data-iap="' + pack.id + '">' + pack.label + '</button>';
    iapEl.appendChild(row);
  }
}

function initEconomyUI() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  document.getElementById("cos-filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    cosShopFilter = btn.dataset.filter;
    markEconomyDirty();
    renderCosShop();
  });

  document.getElementById("cos-shop-list").addEventListener("click", (e) => {
    const row = e.target.closest(".shop-row[data-shop-id]");
    if (!row) return;
    purchaseShopItem(row.dataset.shopId);
  });

  document.getElementById("inv-grid").addEventListener("click", (e) => {
    const equipBtn = e.target.closest("[data-equip]");
    if (equipBtn) { equipCosmetic(equipBtn.dataset.equip); return; }
    const claimBtn = e.target.closest("[data-claim-medal]");
    if (claimBtn) {
      const m = COLLECTIBLE_MEDALS.find((x) => x.id === claimBtn.dataset.claimMedal);
      if (m) claimCollectibleMedal(m);
    }
  });

  document.querySelectorAll(".inv-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".inv-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      markEconomyDirty();
      renderInventory();
    });
  });

  document.getElementById("exchange-list").addEventListener("click", (e) => {
    const row = e.target.closest("[data-ex-gem]");
    if (!row) return;
    const pack = GEM_EXCHANGE.find((p) => p.id === row.dataset.exGem);
    if (!pack) return;
    if (state.stardust < pack.stardust) {
      showToast("Need " + formatNum(pack.stardust - state.stardust) + " more ✨");
      playTone(180, 0.1, "sawtooth", 0.05);
      return;
    }
    buyGemExchange(pack);
  });

  document.getElementById("iap-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-iap]");
    if (btn) {
      const pack = REAL_MONEY_PACKAGES.find((p) => p.id === btn.dataset.iap);
      if (pack) buyRealMoneyPackage(pack);
    }
  });

  document.getElementById("iap-confirm").addEventListener("click", confirmDemoPurchase);
  document.getElementById("iap-cancel").addEventListener("click", () => {
    document.getElementById("iap-modal").hidden = true;
  });
}
