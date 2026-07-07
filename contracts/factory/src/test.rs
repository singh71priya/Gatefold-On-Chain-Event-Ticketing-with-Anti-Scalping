#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Env, String as SorobanString};

fn create_token<'a>(env: &Env, admin: &Address) -> (Address, token::StellarAssetClient<'a>, token::Client<'a>) {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let address = sac.address();
    let admin_client = token::StellarAssetClient::new(env, &address);
    let client = token::Client::new(env, &address);
    (address, admin_client, client)
}

/// NOTE: these tests deploy a *stub* registry address and rely on
/// `mock_all_auths` so `create_event`'s cross-contract call succeeds without
/// a real Registry contract instance deployed in-process. The Registry's own
/// logic is fully covered separately in `contracts/registry/src/test.rs`.
/// Tests that need a real registry response (resale flow) deploy the actual
/// ResaleRegistryContract inline below.
fn setup_event(env: &Env) -> (TicketFactoryContractClient<'static>, u64, Address, token::Client<'static>, Address) {
    env.mock_all_auths();
    let contract_id = env.register(TicketFactoryContract, ());
    let client = TicketFactoryContractClient::new(env, &contract_id);

    let organizer = Address::generate(env);
    let token_admin = Address::generate(env);
    let (token_addr, token_admin_client, token_client) = create_token(env, &token_admin);

    // Deploy a real registry so cross-contract calls resolve for real.
    let registry_id = env.register(resale_registry_test_shim::ResaleRegistryContract, ());
    let registry_client =
        resale_registry_test_shim::ResaleRegistryContractClient::new(env, &registry_id);
    registry_client.initialize(&contract_id);

    let event_id = client.create_event(
        &organizer,
        &SorobanString::from_str(env, "Indie Rock Night"),
        &token_addr,
        &registry_id,
        &100i128,
        &50u32,
        &11000u32, // 110% cap
        &500u32,   // 5% royalty
    );

    (client, event_id, organizer, token_client, registry_id)
}

// Inline shim so the factory test binary can also link the registry crate's
// contract type without adding a workspace-crossing dev-dependency cycle.
mod resale_registry_test_shim {
    pub use resale_registry::{ResaleRegistryContract, ResaleRegistryContractClient};
}

#[test]
fn test_create_event_stores_correct_state() {
    let env = Env::default();
    let (client, event_id, _organizer, _token_client, _registry) = setup_event(&env);

    let event = client.get_event(&event_id);
    assert_eq!(event.total_tickets, 50u32);
    assert_eq!(event.tickets_minted, 0u32);
}

#[test]
fn test_mint_ticket_transfers_face_value_to_organizer() {
    let env = Env::default();
    let (client, event_id, organizer, token_client, _registry) = setup_event(&env);

    let token_admin = Address::generate(&env);
    let buyer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin.clone());
    // mint via existing token client's underlying asset admin instead:
    let event = client.get_event(&event_id);
    let admin_client = token::StellarAssetClient::new(&env, &event.token);
    admin_client.mint(&buyer, &1_000i128);

    let ticket_id = client.mint_ticket(&event_id, &buyer);
    assert_eq!(ticket_id, 0u64);
    assert_eq!(token_client.balance(&organizer), 100i128);

    let ticket = client.get_ticket(&event_id, &ticket_id);
    assert_eq!(ticket.owner, buyer);
    assert_eq!(ticket.checked_in, false);
    let _ = sac; // unused after mint via admin_client
}

#[test]
fn test_sold_out_rejects_further_mints() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(TicketFactoryContract, ());
    let client = TicketFactoryContractClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let (token_addr, admin_client, _token_client) = create_token(&env, &token_admin);
    let registry_id = env.register(resale_registry_test_shim::ResaleRegistryContract, ());
    resale_registry_test_shim::ResaleRegistryContractClient::new(&env, &registry_id)
        .initialize(&contract_id);

    let event_id = client.create_event(
        &organizer,
        &SorobanString::from_str(&env, "Sold Out Show"),
        &token_addr,
        &registry_id,
        &50i128,
        &1u32, // only 1 ticket available
        &11000u32,
        &500u32,
    );

    let buyer1 = Address::generate(&env);
    let buyer2 = Address::generate(&env);
    admin_client.mint(&buyer1, &500i128);
    admin_client.mint(&buyer2, &500i128);

    client.mint_ticket(&event_id, &buyer1);
    let result = client.try_mint_ticket(&event_id, &buyer2);
    assert!(result.is_err());
}

#[test]
fn test_verify_entry_flips_checked_in_and_rejects_reuse() {
    let env = Env::default();
    let (client, event_id, organizer, _token_client, _registry) = setup_event(&env);

    let event = client.get_event(&event_id);
    let admin_client = token::StellarAssetClient::new(&env, &event.token);
    let buyer = Address::generate(&env);
    admin_client.mint(&buyer, &1_000i128);
    let ticket_id = client.mint_ticket(&event_id, &buyer);

    client.verify_entry(&event_id, &ticket_id, &organizer);
    let ticket = client.get_ticket(&event_id, &ticket_id);
    assert_eq!(ticket.checked_in, true);

    let result = client.try_verify_entry(&event_id, &ticket_id, &organizer);
    assert!(result.is_err());
}

#[test]
fn test_resale_enforces_price_cap_via_registry_cross_contract_call() {
    let env = Env::default();
    let (client, event_id, _organizer, _token_client, _registry) = setup_event(&env);

    let event = client.get_event(&event_id);
    let admin_client = token::StellarAssetClient::new(&env, &event.token);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    admin_client.mint(&seller, &1_000i128);
    admin_client.mint(&buyer, &1_000i128);

    let ticket_id = client.mint_ticket(&event_id, &seller);

    // face_value=100, cap=110% => max 110. Attempting to sell at 150 must fail.
    let result = client.try_resell_ticket(&event_id, &ticket_id, &buyer, &150i128);
    assert!(result.is_err());
}

#[test]
fn test_ticket_not_found_errors() {
    let env = Env::default();
    let (client, event_id, _organizer, _token_client, _registry) = setup_event(&env);
    let result = client.try_get_ticket(&event_id, &999u64);
    assert!(result.is_err());
}
