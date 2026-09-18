# Focusling — Nimiq Pay Mini App Overview

---

## 1. App Overview

**App Name:** Focusling

**Logo & Branding Assets:** [TBC — add Cloudinary/Figma link]

**Website / App URL:**
- Landing: https://focusling.app
- App: https://app.focusling.app

**Figma Screens:** [TBC]

**Short Description:**

Focusling is a productivity Mini App for Nimiq Pay where users complete timed focus sessions to earn XP, grow a virtual pet, and compete on a global leaderboard — turning daily discipline into a visible, on-chain record of consistency.

---

## 2. Key Features & Use Cases

**Feature Highlights:**

1. **Focus Sessions** — Users pick 10, 25, or 45-minute sessions (or set custom durations). Each completed session earns XP, feeds their pet, and advances their streak.

2. **Virtual Pet Evolution** — Every user owns a Cyber Dino that evolves through multiple stages as a public record of their consistency. The more hours focused, the more the pet grows — with higher stages requiring progressively more dedication.

3. **Global Leaderboard** — Players compete for the top spot by total XP, with periodic competitions like **Focus Blitz** (multi-day sprints with streak bonuses).

4. **In-App Shop (NIM or USDC)** — Users pay with NIM or USDC, their choice, to buy items that help their pet survive and grow: food to restore health, energy drinks for a 2x XP boost, streak shields for protection, and cosmetics to personalise their pet.

5. **XP Boosts** — Purchasing an energy drink from the shop activates a 24-hour 2x XP multiplier, letting dedicated focusers accelerate their leaderboard climb.

**Target Market / User Persona:**
- Nimiq Pay users looking for a rewarding productivity app
- Productivity enthusiasts who want accountability and a fun reason to stay off their phone
- Mobile-first users worldwide
- Anyone who wants to build better habits and track their discipline visibly on-chain

---

## 3. Coverage & Regional Availability

**Geographical Scope:**
- Global — available to any Nimiq Pay user
- No geographic restrictions; no licensing requirements currently

**Languages / Translations Offered:**
- English (primary)
- [TBC — additional languages via Nimiq Pay's localization support]

---

## 4. App Category / Industry

**Primary Category:** Productivity / GameFi

**Secondary Categories:** Social (leaderboard & competitions)

---

## 5. Integration Details

**Payment Token:**
- NIM (native Nimiq payment) and USDC on Base — both accepted for every in-app purchase

**Blockchain:** Base Mainnet (Chain ID: 8453), reached through Nimiq Pay's injected Ethereum provider

**Core Contract:** [TBC — filled in after `contracts/scripts/deploy.js` runs]

**Auth Methods:**
- Nimiq Pay (auto-connect via its injected EVM provider, no extra wallet or login step)

**Data Layer:**
- A Goldsky subgraph indexes on-chain events for the leaderboard and per-user history — there is no separate application database.

---

## 6. Rollout Strategy

**Preferred Launch Date:** [TBC]

**Promo Activities / Offers:**
- **Focus Blitz Competitions** — periodic multi-day sprints with leaderboard prizes and streak multipliers

---

## 7. Compliance & Legal Considerations

**Regulatory Requirements:**
- XP and leaderboard rankings are engagement mechanics, not financial instruments
- Shop purchases are straightforward NIM or USDC microtransactions for in-app items
- No financial services license currently required; app functions as a productivity tool with in-app purchases
- No user funds are custodied by Focusling — USDC goes directly to the smart contract; NIM payments go straight to the treasury's Nimiq address; items are delivered on-chain either way

**KYC / AML Needs:**
- No KYC required. No off-chain database of user PII — a wallet address is the only identifier, and it's public on-chain.

---

## 8. User Support & Escalation

**Support Channels:**
- [TBC — email support address]
- [TBC — Help Center / FAQ link]

---

## 9. Branding & Marketing Collateral

**Marketing Assets:**
- App URL for live testing: https://app.focusling.app
- Pet asset CDN: Cloudinary (Cyber Dino — Egg, Baby, Adult stages)
- High-res logo: [TBC]
- Figma screens: [TBC]

**Key Visual Identity:**
- Dark-first UI (black background, violet/coral/emerald accents)
- Cyber Dino as the mascot — stages communicate user progress visually
- "FOCUSLING" wordmark in Unbounded bold uppercase

---

## 10. Success Metrics & KPIs

**Primary KPIs:**
- Monthly Active Users (MAU) completing ≥ 1 focus session
- Total focus hours logged (XP proxy)
- NIM and USDC volume transacted via in-app shop
- Day-over-day retention rate
- Pet evolution distribution (% of users reaching Baby / Teen / Adult / Elder)
- Leaderboard participation rate during competition windows

**Reporting Frequency:** Weekly during active competition periods; monthly otherwise

---

## Optional Fields

**Competitive Differentiator:**
Focusling is a productivity app that converts focus time into verifiable on-chain XP and a living virtual pet — not points that expire, not fictitious tokens. The Cyber Dino is a tamper-proof, public record of a user's discipline. For Nimiq Pay users, the entire experience runs natively inside Nimiq Pay with no extra wallets, and every microtransaction can be paid in either NIM or USDC.

**Testimonials / Case Studies:** [TBC]

**Future Features / Roadmap:**
- New pet species beyond Cyber Dino
- Multiplayer focus rooms (focus together, earn together)
- Guild / team competitions
- Expanded language support via Nimiq Pay's localization
