Markdown
# 🌌 Cosmic Idle

A mesmerizing mini idle-clicker game integrated with an immersive **Cosmic Capsule Gacha** mechanic. Tap the celestial crystal, deploy automated space generators, and harness the power of stardust to pull game-changing buffs and cosmetic enhancements from the capsule machine. 

---

## 🚀 Key Value Propositions (Passive Monetization Design)

Unlike traditional hyper-casual web games, *Cosmic Idle* is deliberately architected around gameplay loops that optimize player lifetime value (LTV) and passive income generation:

* **Extended Session Length:** The interactive clicking combined with progressive purchasing decisions keeps players active on the page longer, maximizing continuous ad impression frequency.
* **Predictable Return Visits:** Built-in local auto-save mechanics alongside a robust **Offline Earnings System (up to 8 hours)** incentivize multiple daily log-ins to collect accrued passive revenue.
* **Organic Shareable Moments:** Low-probability, high-impact *Legendary Capsule Pulls* generate highly shareable content perfect for screenshot-sharing on Discord, Reddit, and social media platforms.

---

## 🪐 Game Loop & Architecture

┌──────────────────┐       ┌──────────────────────┐       ┌───────────────────┐
│   Tap Crystal    │ ───>  │ Accumulate Stardust  │ ───>  │  Buy Generators   │
└──────────────────┘       └──────────────────────┘       └───────────────────┘
▲                                                           │
│                                                           ▼
┌──────────────────┐       ┌──────────────────────┐       ┌───────────────────┐
│ Maximize Output  │ <───  │   Pull Gacha Buffs   │ <───  │ Earn Passive ✨/s │
└──────────────────┘       └──────────────────────┘       └───────────────────┘


| Player Action | System Mechanics & Economic Effect |
| :--- | :--- |
| **Tap Celestial Crystal** | Generates manual **Stardust (✨)**. Upgradable via clicking power multipliers. |
| **Deploy Generators** | Establishes compounding, passive **Stardust per Second (✨/s)** revenue streams. |
| **Pull Cosmic Capsules** | Unlocks random tier rewards, including instant stardust bursts, temporary multipliers, and permanent efficiency boosts. |
| **Purchase Upgrades** | Applies global exponential multipliers to manual clicking power and autonomous generator yields. |

*All progression metrics automatically serialize and persist using the client's `localStorage` API.*

---

## 💎 Ecosystem & Dual-Currency Framework

*Cosmic Idle* utilizes a sophisticated dual-currency system designed to mimic major modern mobile titles, optimizing player monetization pathways.

* **Stardust (✨):** Standard soft currency earned completely through manual clicking, automated generator production, and standard capsule gacha rewards.
* **Void Gems (💎):** Premium hard currency acquired by trading vast reserves of Stardust or through integrated Real-Money Purchases (RMP).

### Interface Segmentation

* **✨ Shop:** Trade soft or premium currency for a diverse array of cosmic cosmetics (Crystal Skins, Nebula Themes, Particle Effects, Orbit Trails, and custom Titles).
* **🎒 Bag:** A centralized inventory system allowing players to manage/equip unlocked skins, view collected lifetime medals, and inspect limited-time event rewards.
* **💎 Gems Exchange:** An integrated store interface allowing players to seamlessly buy Void Gems via credit card or digital wallets, or exchange high-volume Stardust for premium gems.

> 🔔 **Live Architecture Note:** Real-money transactions are powered by a live Stripe Checkout pipeline. Secure client-side requests execute via the `iap-confirm` webhook to validate instant credit delivery to player profiles.
