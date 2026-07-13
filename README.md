<div align="center">
  
# 🎟️ Gatefold - On-Chain Event Ticketing with Anti-Scalping

**A decentralized ticketing platform built on Stellar & Soroban smart contracts.**  
*Gatefold completely prevents scalping by enforcing maximum resale price caps and automated royalty payments to event organizers natively on-chain.*

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue.svg)](https://stellar.org/soroban)
[![Vite](https://img.shields.io/badge/Frontend-Vite_React-purple.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black.svg?logo=vercel)](https://gatefold-on-chain-event-ticketing-w.vercel.app/)
[![Video Demo](https://img.shields.io/badge/Video%20Demo-Google%20Drive-red.svg?logo=google-drive)](https://drive.google.com/file/d/1UdzMM3J4gPRDqZPVe34DyGF73d3lRZPT/view?usp=sharing)

### 🔗 [▶️ Live App](https://gatefold-on-chain-event-ticketing-w.vercel.app/) &nbsp;|&nbsp; [🎥 Video Demo](https://drive.google.com/file/d/1UdzMM3J4gPRDqZPVe34DyGF73d3lRZPT/view?usp=sharing)

</div>

<br />

## 🌟 Key Features

1. **Un-Scalpable Tickets:** Organizers set a maximum resale percentage. Smart contracts physically prevent secondary sales above this price.
2. **Automated Royalties:** If a ticket is resold, the organizer's royalty percentage is mathematically calculated and transferred to them instantaneously in the same transaction.
3. **Cryptographic Check-in:** Door staff scan QR codes that are cryptographically verified by the smart contract, preventing counterfeit tickets and double-entries.
4. **Real-time Settlement:** Payments, ticket transfers, and royalties are settled on the Stellar network in 3-5 seconds with near-zero transaction fees.

---

## 📸 Application Showcase

### 1. The Ticketing dApp (Mobile Responsive)
*The platform is fully mobile responsive, allowing attendees to show their ticket QR codes right at the door.*

![Mobile Responsive UI](screenshots/mobile_ui.png)

### 2. Automated Deployments (CI/CD)
*Smart contracts and the React frontend are automatically compiled and deployed to the Testnet via GitHub Actions.*

![CI/CD Pipeline](screenshots/cicd.png)

### 3. Smart Contract Test Coverage
*The Soroban smart contracts feature rigorous unit testing to ensure bulletproof anti-scalping execution.*

![Test Output](screenshots/tests.png)

---

## 🛠️ Architecture

This project is split into three main components:

1. **Factory Contract (`contracts/factory/`)**
   - Mints NFTs (Event Tickets).
   - Serves as the central interface for buying and checking in.
2. **Registry Contract (`contracts/registry/`)**
   - The anti-scalping engine.
   - Enforces the price ceiling mathematically on every secondary sale.
   - Calculates the royalty split for the organizer.
3. **Frontend Application (`frontend/`)**
   - React + Vite Single Page Application.
   - Integrates with `@creit.tech/stellar-wallets-kit` for seamless wallet connectivity.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18+)
- Rust (latest stable)
- Stellar CLI (`cargo install --locked stellar-cli`)

### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```

### Running Smart Contract Tests
Navigate to the root directory and run the Cargo test suite:
```bash
cargo test --workspace
```
