# NimPet

NimPet gives you a focus companion — a living creature that grows with your real-world deep work. Complete focus sessions, earn XP, and watch your companion evolve — from egg to elder — based purely on your consistency. Built on Base and distributed as a Nimiq Pay mini app.

> The contract, hooks, and some internal file names still say `Focusling` — that's the project's original name, and renaming the already-deployed contract isn't possible without redeploying. The app itself is branded NimPet everywhere a user sees it.

---

## How it works

### Focus sessions

Set a timer — 5, 10, 25, 45 minutes, or a custom duration up to 2 hours — and stay focused. When the session ends, your pet receives XP and health is restored. Sessions are recorded on-chain via the Focusling smart contract on Base.

### Pet evolution

Your pet's stage is determined by cumulative XP:

| Stage  | Description                         |
| ------ | ----------------------------------- |
| Egg    | Starting state for every new user   |
| Baby   | First evolution — a few minutes of focus |
| Teen   | Mid-tier — a solid day's worth of sessions |
| Adult  | A multi-day streak of consistency   |
| Elder  | Top tier — reserved for the consistent few |

### Health and decay

Pets lose 10 health every 24 hours. Neglect long enough and the pet goes dormant and stops earning XP. Feed it from the shop, or use a shield to protect your streak. Let health hit zero and the pet dies outright — reviving it costs real NIM or USDC.

### Streaks and bonuses

A daily streak is maintained by completing at least one session per day. Streak length adds a percentage bonus to XP earned, up to 20%. A streak shield (purchasable in the shop) absorbs one missed day without resetting the counter.

### Night owl bonus

Sessions started between midnight and 6 AM receive a 1.1x XP multiplier.

---

## Shop

NIM is the default, first-class payment method — every purchase is confirmed directly through Nimiq Pay's own native dialog, no separate wallet popup. USDC on Base is available as an equal alternative, one tap away via an in-shop currency toggle.

| Item         | USDC Price | Effect                                      |
| ------------ | ---------- | -------------------------------------------- |
| Food         | $0.10      | Restores pet health                         |
| Super Food   | $0.25      | Restores full health                        |
| Energy Drink | $0.20      | Activates a 2x XP boost for 24 hours        |
| Shield       | $0.50      | Protects streak from one missed day         |
| Revive       | $0.25      | Brings a dead pet (0% health) back to life  |
| Cosmetics    | varies     | Equippable items displayed on the pet view  |

NIM prices are set independently per item in `dapp/src/hooks/useFocusling.tsx` and `dapp/src/app/app/shop/page.tsx` — check there for current values, as they may be temporarily adjusted for demo/testing purposes.

### Gas faucet

Nimiq-native users hold NIM, not ETH — but every on-chain action (hatching, recording a session) is a Base transaction that needs a small amount of ETH for gas. `dapp/src/app/api/faucet/route.ts` auto-drips a small amount of ETH to first-time users from a dedicated, lightly-funded wallet (never the contract owner key), gated by Nimiq Pay's device identifier, an IP rate limit, one-drip-per-device/address, and a global spend cap.

---

## Leaderboard & campaign

A global leaderboard ranks users by XP. Each entry shows username, pet stage, and streak length. The leaderboard is open — no wallet connection required to view it, and it's read directly from a Goldsky subgraph indexing the Focusling contract on Base. A static "Evolution Challenge" campaign banner (Guide page) highlights a NIM reward for early Elders — purely informational, no on-chain tracking or automated payout.

---

## Nimiq Pay

NimPet runs as a mini app inside Nimiq Pay. Nimiq Pay injects a standard EIP-1193 Ethereum provider for Base into its mini-app WebView, so the wallet connects automatically inside the app — no extra login step. Outside Nimiq Pay (desktop testing, or any browser with multiple wallet extensions installed), a real wallet picker lists every EIP-6963-announced wallet instead of guessing which one to use.

---

## Tech stack

| Layer          | Technology                                      |
| -------------- | ----------------------------------------------- |
| Frontend       | Next.js 16 (App Router), React 19, Tailwind v4  |
| Wallet         | Nimiq Pay's injected Ethereum provider, via wagmi + viem |
| Blockchain     | Base (mainnet)                                  |
| Contract       | Solidity — UUPS upgradeable (OpenZeppelin)      |
| Data layer     | Goldsky subgraph (no application database)      |
| Animations     | Framer Motion                                   |

There is no application backend — all reads (leaderboard, per-user history, name-uniqueness checks) come from the subgraph or directly from the contract. The one server-side API route (`/api/faucet`) exists solely to send gas, not to store or serve app data.

---

## Smart contract

The `Focusling` contract is deployed on **Base mainnet** and handles:

- Recording focus sessions and computing XP with active multipliers (streak bonus, boost)
- Health decay calculation based on time since last interaction
- Streak tracking and shield consumption
- NIM and USDC payments for shop items, including reviving a dead pet
- Cosmetic inventory and equipped state
- Self-service migration of a pet's full state to a new address
- `deleteUser()` — a self-service full reset of the caller's own pet

The contract is UUPS upgradeable and owned by the deployer address.

---

## Running locally

```bash
cd dapp
npm install
npm run dev
```

Required environment variables (see `dapp/.env.example`):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ALCHEMY_RPC_URL` | Base mainnet RPC for wagmi's transport (falls back to the public `mainnet.base.org` endpoint if unset) |
| `NEXT_PUBLIC_SUBGRAPH_URL` | Goldsky subgraph endpoint |
| `NEXT_PUBLIC_APP_URL` | Optional — overrides the landing page's "Get Started" link target |
| `FAUCET_PRIVATE_KEY` | Server-only — private key for the dedicated gas-faucet wallet. Must be a separate, lightly-funded wallet, never the contract owner/deployer key |
| `NEXT_PUBLIC_NIMIQ_RPC_URL` | Optional — Nimiq Albatross JSON-RPC endpoint for displaying NIM balance in the shop/wallet modal. Falls back to the free public `rpc.nimiqwatch.com` node if unset |

The deployed contract address lives in `dapp/src/config/contracts.ts`.

To deploy the contract (already deployed to Base mainnet — redeploying creates a new address and orphans existing pet data, so only do this if you actually mean to):

```bash
cd contracts
npm install
npx hardhat compile
PRIVATE_KEY=... TREASURY_ADDRESS=... npx hardhat run scripts/deploy.js --network base
```

---

## Project structure

```
NimPet/
  contracts/         Solidity source, artifacts, and deployment scripts
  subgraph/           Goldsky subgraph indexing on-chain events for the leaderboard
  dapp/
    src/
      app/            Next.js App Router pages and API routes (incl. /api/faucet)
      components/     UI components
      hooks/          Wagmi and app-specific React hooks
      utils/          Pet stage logic, XP formulas, helpers
    public/           Static assets — pet sprites, shop images, icons
```
