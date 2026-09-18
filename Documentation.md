_Focusling: Nimiq Mini Apps Competition Documentation_

**Executive Summary**

Focusling is a gamified productivity application built on Base and distributed as a Nimiq Pay mini app, designed to improve users' attention spans and discipline. By combining the proven Pomodoro technique with a digital pet companion, Focusling transforms deep work into achievable, rewarding milestones — with every purchase payable in either NIM or USDC through the wallet already built into Nimiq Pay.

_Core Mechanics: Focus → Earn → Nurture → Compete_

The core loop of Focusling is designed to foster consistency and discipline:

- **Commit to Focus:** Users select a focus duration (10, 25, 45 minutes, or a custom length up to 2 hours), optionally enable ambient focus sounds, and start the timer.
- **Earn XP:** For every second of uninterrupted focus, users earn XP. XP dictates the user's standing on the global leaderboard, serving as a reputational signal of discipline. Streaks and active boosts multiply XP earned.
- **Health Decay:** A pet's health decays over time without focus sessions. Left unattended long enough, the pet goes dormant.
- **Nurturing the Pet:** To restore a declining pet's health or maintain its energy, users spend NIM or USDC in the Pet Shop — whichever they prefer.

_Why Nimiq Pay_

Nimiq Pay mini apps get both a native Nimiq provider and an injected, standard EIP-1193 Ethereum provider covering several EVM chains. Focusling uses the Nimiq provider for native NIM payments, and the EVM provider to reach a contract deployed on Base for USDC payments and the pet's on-chain state — the same architectural slot a browser extension wallet would fill, except the wallet is already open and needs no separate install. Connecting is a single tap the first time the app opens; Nimiq Pay's own rules require every wallet-access dialog to follow a real user action, so there's no silent auto-connect.

1. **Payments — The Pet Shop Economy, in NIM or USDC**

   The internal economy of Focusling accepts both NIM and USDC — every item has a price in each. While XP is earned through time spent focusing, maintaining and upgrading the digital pet costs one or the other, the player's choice.

   - **Consumables:** Users spend NIM or USDC to revive a pet whose health has declined, or restore health directly.
   - **Boosts & Cosmetics:** Users spend NIM or USDC to purchase energy drinks (temporary XP multipliers), streak shields, and cosmetic items.

2. **Wallet-Native Identity**

   A user's Focusling identity is their connected wallet address — no separate account system, no email, no password. Usernames and pet names are claimed on-chain and enforced unique by the contract.

3. **Fully On-Chain Game State**

   Every focus session, purchase, and profile update is a transaction against the Focusling contract on Base. There is no application database: the leaderboard, activity history, and username-availability checks are all served by a subgraph that indexes the contract's events directly.

**User Flow & Onboarding**

1. **Open the mini app inside Nimiq Pay.** Tap "Connect Wallet" once — Nimiq Pay's own confirmation dialog handles the rest.
2. **Hatch your pet.** Start your first focus session to bring your egg to life.
3. **Learn.** Open the "Guide" tab for an interactive walkthrough of XP, health, and the shop.
4. **Focus.** Set a timer and stay on the page — leaving mid-session fails it.
5. **Grow the economy.** Spend NIM or USDC in the shop to keep your pet fed and boosted, and climb the leaderboard against other Focusers.

Try it live at [focusling.app](https://focusling.app)
