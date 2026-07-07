#!/usr/bin/env bash
# Deploys the ResaleRegistry and TicketFactory contracts to Stellar Testnet.
#
# Prerequisites:
#   - Stellar CLI installed: https://developers.stellar.org/docs/tools/cli
#   - A funded testnet identity: `stellar keys generate deployer --network testnet --fund`
#
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh

set -euo pipefail

NETWORK="testnet"
IDENTITY="deployer"

echo "==> Building contracts"
stellar contract build

echo "==> Deploying ResaleRegistry contract"
REGISTRY_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/resale_registry.wasm \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "ResaleRegistry deployed at: $REGISTRY_ID"

echo "==> Deploying TicketFactory contract"
FACTORY_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/ticket_factory.wasm \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "TicketFactory deployed at: $FACTORY_ID"

echo "==> Initializing ResaleRegistry (authorizing the Factory contract to call it)"
stellar contract invoke \
  --id "$REGISTRY_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize \
  --factory "$FACTORY_ID"

echo ""
echo "=================================================="
echo " Deployment complete"
echo "=================================================="
echo " ResaleRegistry contract ID: $REGISTRY_ID"
echo " TicketFactory contract ID:  $FACTORY_ID"
echo ""
echo " Next steps:"
echo " 1. Add these IDs to frontend/.env as VITE_REGISTRY_CONTRACT_ID and VITE_FACTORY_CONTRACT_ID"
echo " 2. Deploy or reuse a testnet SEP-41 token, set VITE_TOKEN_CONTRACT_ID"
echo " 3. Run scripts/sample_interaction.sh to create an event and mint a ticket for your submission's tx hash"
echo "=================================================="
