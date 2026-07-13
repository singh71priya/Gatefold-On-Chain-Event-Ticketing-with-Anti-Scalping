#!/usr/bin/env bash
# Runs an end-to-end interaction against deployed testnet contracts so you
# have a real transaction hash for the submission checklist: create an event,
# mint a ticket, then check it in.
#
# Fill in these values after running deploy.sh:
FACTORY_ID="REPLACE_WITH_FACTORY_CONTRACT_ID"
REGISTRY_ID="REPLACE_WITH_REGISTRY_CONTRACT_ID"
TOKEN_ID="REPLACE_WITH_TESTNET_TOKEN_ID"
ORGANIZER_IDENTITY="deployer"
BUYER_ADDRESS="REPLACE_WITH_A_TESTNET_ADDRESS"

set -euo pipefail

ORGANIZER_ADDRESS="$(stellar keys address $ORGANIZER_IDENTITY)"

echo "==> Publishing a sample event"
EVENT_ID=$(stellar contract invoke \
  --id "$FACTORY_ID" \
  --source "$ORGANIZER_IDENTITY" \
  --network testnet \
  -- create_event \
  --organizer "$ORGANIZER_ADDRESS" \
  --name "Indie Rock Night" \
  --token "$TOKEN_ID" \
  --registry "$REGISTRY_ID" \
  --face_value 100 \
  --total_tickets 50 \
  --max_resale_bps 11000 \
  --royalty_bps 500)
echo "Event ID: $EVENT_ID"

echo "==> Minting a ticket to the buyer (buyer must sign, this uses their key if configured separately)"
echo "Run this with the buyer's own identity configured in the Stellar CLI:"
echo "stellar contract invoke --id $FACTORY_ID --source <buyer-identity> --network testnet -- mint_ticket --event_id $EVENT_ID --buyer $BUYER_ADDRESS"

echo ""
echo "Copy the transaction hash printed above into your README / submission form."
