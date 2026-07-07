# Gatefold — On-Chain Event Ticketing with Anti-Scalping

Event tickets as on-chain, transferable records with a hard resale price cap
and an automatic organizer royalty. Every resale is checked against the cap
by a dedicated **ResaleRegistry contract** before it can go through — the
scalper's listing simply fails to submit, and the organizer gets their cut
of every legitimate resale without lifting a finger.

Built for the Stellar Orange Belt submission.

---

## Why this project

Scalping works today because there's no enforcement layer between "list a
ticket for resale" and "money changes hands" — a reseller can list at any
price on any secondary marketplace, and organizers see none of that upside.
This project puts the enforcement on-chain:

- **Price cap is a contract invariant, not a policy.** `check_and_record_resale` rejects any sale price above the cap — there's no marketplace UI to route around.
- **Organizer royalty is automatic.** Every resale pays a configurable percentage back to the organizer in the same transaction.
- **Entry is a one-way flip.** A ticket can be checked in exactly once; the door staff's QR scan calls the contract directly, no separate ticketing database to trust.

---

## Architecture

```
Attendee / Organizer
        │
        ▼
 React frontend (QR mint + scan, live check-in feed)
        │
        ▼
 TicketFactory contract ──────► Token contract (face value + royalty payments)
        │
        └──────────────────────► ResaleRegistry contract (price cap + royalty calc)
```

**Inter-contract communication**: the Factory contract calls the Registry
twice in its lifecycle — once in `create_event` to register the organizer's
pricing policy, and again on every `resell_ticket` call via
`check_and_record_resale`, which enforces the cap and returns the royalty
owed (`contracts/factory/src/lib.rs`). The Registry in turn requires
`factory.require_auth()`, so only the authorized Factory instance can record
a resale against its own history.

**Event streaming**: every state change (`EventCreated`, `TicketMinted`,
`TicketResold`, `EntryVerified`) is emitted as a Soroban contract event. The
frontend's `useContractEvents` hook polls `getEvents` on a short interval and
renders a live activity feed — this is what powers the door-side check-in
feed and the organizer's resale ticker in real time.

---

## Project structure

```
ticket-anti-scalp/
├── contracts/
│   ├── factory/          # Main contract: events, tickets, resale, check-in
│   │   └── src/
│   │       ├── lib.rs
│   │       └── test.rs   # 6 unit tests
│   └── registry/          # Anti-scalping enforcement, called cross-contract
│       └── src/
│           ├── lib.rs
│           └── test.rs   # 7 unit tests
├── frontend/
│   ├── src/
│   │   ├── components/    # TicketStub, QRScanner, EventFeed, forms
│   │   ├── hooks/         # useWallet, useContractEvents
│   │   ├── contracts/     # factoryClient.js, config.js
│   │   └── test/          # Vitest + Testing Library specs
│   └── package.json
├── scripts/
│   ├── deploy.sh              # Deploys + initializes both contracts to testnet
│   └── sample_interaction.sh  # Runs create_event for a demo tx hash
├── .github/workflows/ci.yml   # CI: contract tests + frontend tests + build
└── vercel.json
```

---

## Smart contract design

### TicketFactory contract (`contracts/factory`)

| Function | Caller | What it does |
|---|---|---|
| `create_event` | Organizer | Registers event + cross-contract call to set the Registry's pricing policy |
| `mint_ticket` | Buyer | Pays face value to organizer, mints a ticket |
| `resell_ticket` | Buyer (new owner) | Cross-contract call into Registry for cap check + royalty, then executes payment |
| `verify_entry` | Organizer / door staff | One-way check-in flip; rejects reuse |
| `get_event` / `get_ticket` | Anyone (read-only) | Returns event / ticket state |

### ResaleRegistry contract (`contracts/registry`)

| Function | Caller | What it does |
|---|---|---|
| `initialize` | Deployer | Authorizes the one Factory contract permitted to record resales |
| `register_policy` | Organizer (via Factory) | Sets face value, resale cap (bps), royalty (bps) for an event |
| `check_and_record_resale` | Factory contract only | Validates price ≤ cap, computes royalty, appends to resale history |
| `get_policy` / `get_resale_history` / `max_resale_price` | Anyone (read-only) | Inspect pricing and history |

Prices are capped as basis points of face value (e.g. `11000` = 110%), so a
$50 face-value ticket with an 110% cap can never resell above $55 — enforced
by the contract, not a UI validation that a scalper could bypass by calling
the contract directly.

Errors are typed contract errors (`FactoryError`, `RegistryError`) rather
than panics, so the frontend gets a clean, catchable failure reason — e.g.
"price exceeds cap" — instead of a raw trap.

---

## Frontend

- **React 18 + Vite + Tailwind**, mobile-first, styled around a literal
  paper-ticket-stub metaphor (perforated tear line, ink-stamp check-in
  marker) rather than a generic SaaS dashboard.
- **Wallet connect** via Stellar Wallets Kit (Freighter, xBull, Albedo, etc.).
- **QR mint + scan**: a minted ticket renders a QR code encoding
  `{eventId, ticketId}`; the check-in view uses the device camera (`jsQR`) to
  scan it and call `verify_entry`, with a manual-entry fallback for
  camera-denied devices — this is the flow demoed on a phone at the "gate."
- **Live activity feed** driven by `useContractEvents` (polls Soroban RPC `getEvents`).
- **Three views**: Box office (buy/resell), Organizer (publish an event),
  Check-in (scan and admit) — switchable via the nav, each independently
  mobile-responsive.
- **Error and loading states** throughout: skeleton loaders while fetching
  an event, dismissible error/success banners, disabled buttons mid-transaction,
  a clear "price exceeds cap" message surfaced straight from the contract error.

### Environment variables

Copy `frontend/.env.example` to `frontend/.env` and fill in the contract IDs
from `scripts/deploy.sh`:

```
VITE_FACTORY_CONTRACT_ID=
VITE_REGISTRY_CONTRACT_ID=
VITE_TOKEN_CONTRACT_ID=
```

---

## Running locally

### Contracts

```bash
# Requires Rust + wasm32-unknown-unknown target + Stellar CLI
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli

cargo test --workspace          # run all contract tests
stellar contract build           # build .wasm files
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # local dev server
npm run test      # Vitest unit tests
npm run build     # production build
```

---

## Deployment (testnet)

```bash
stellar keys generate deployer --network testnet --fund
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

This builds both contracts, deploys them to Stellar Testnet, initializes the
Registry to authorize the Factory contract, and prints both contract IDs.

Then run the sample interaction script to publish a demo event and get a
real transaction hash for your submission:

```bash
chmod +x scripts/sample_interaction.sh
# fill in the contract IDs at the top of the script first
./scripts/sample_interaction.sh
```

Deploy the frontend to Vercel/Netlify pointing at `frontend/` as the root
(see `vercel.json`), with the three `VITE_*` env vars set in the dashboard.

---

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR to `main`:

1. **Contracts job** — builds both contracts to `wasm32-unknown-unknown` and runs `cargo test --workspace`.
2. **Frontend job** — installs deps, lints, runs Vitest, builds the production bundle.
3. **Deploy-readiness job** — gates on both passing before signaling the build is deploy-ready.

---

## Testing

- **Contracts**: 13 Rust unit tests total (6 in `factory`, 7 in `registry`) covering the happy path, price-cap rejection, sold-out events, double check-in, unauthorized callers, and not-found cases. Run with `cargo test --workspace`.
- **Frontend**: Vitest + React Testing Library specs for the ticket stub component and the event-creation form's basis-point conversion. Run with `npm run test` inside `frontend/`.

---

## Submission checklist mapping

| Requirement | Where |
|---|---|
| Inter-contract communication | `factory::create_event` / `resell_ticket` call into `registry` |
| Event streaming & real-time updates | Contract events + `useContractEvents` polling hook, live check-in feed |
| CI/CD pipeline | `.github/workflows/ci.yml` |
| Deployment workflow | `scripts/deploy.sh` |
| Mobile responsive frontend | Tailwind responsive layout + camera-based QR scan view, phone-first |
| Error handling & loading states | `Banner.jsx`, `Skeleton.jsx`, try/catch in `App.jsx` |
| Tests (contracts + frontend) | `contracts/*/src/test.rs`, `frontend/src/test/*.test.jsx` |
| Documentation | This README + inline doc comments in every contract |

---

## License

MIT
