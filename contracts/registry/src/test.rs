#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::Env;

fn setup() -> (Env, ResaleRegistryContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ResaleRegistryContract, ());
    let client = ResaleRegistryContractClient::new(&env, &contract_id);

    let factory = Address::generate(&env);
    let organizer = Address::generate(&env);
    client.initialize(&factory);
    (env, client, factory, organizer)
}

#[test]
fn test_register_policy_stores_correct_values() {
    let (_env, client, _factory, organizer) = setup();
    client.register_policy(&organizer, &1u64, &100i128, &11000u32, &500u32);

    let policy = client.get_policy(&1u64);
    assert_eq!(policy.face_value, 100i128);
    assert_eq!(policy.max_resale_bps, 11000u32);
}

#[test]
fn test_resale_within_cap_succeeds_and_computes_royalty() {
    let (env, client, _factory, organizer) = setup();
    client.register_policy(&organizer, &1u64, &100i128, &11000u32, &500u32);

    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);

    // face_value=100, cap=110% => max 110. Selling at 110 with 5% royalty = 5.5 -> 5 (integer division)
    let royalty = client.check_and_record_resale(&1u64, &42u64, &seller, &buyer, &110i128);
    assert_eq!(royalty, 5i128);
}

#[test]
fn test_resale_above_cap_rejected() {
    let (env, client, _factory, organizer) = setup();
    client.register_policy(&organizer, &1u64, &100i128, &11000u32, &500u32);

    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);

    let result = client.try_check_and_record_resale(&1u64, &42u64, &seller, &buyer, &111i128);
    assert!(result.is_err());
}

#[test]
fn test_resale_history_accumulates() {
    let (env, client, _factory, organizer) = setup();
    client.register_policy(&organizer, &1u64, &100i128, &12000u32, &500u32);

    let seller1 = Address::generate(&env);
    let buyer1 = Address::generate(&env);
    let buyer2 = Address::generate(&env);

    client.check_and_record_resale(&1u64, &7u64, &seller1, &buyer1, &105i128);
    client.check_and_record_resale(&1u64, &7u64, &buyer1, &buyer2, &110i128);

    let history = client.get_resale_history(&1u64, &7u64);
    assert_eq!(history.len(), 2);
}

#[test]
fn test_invalid_bps_rejected() {
    let (_env, client, _factory, organizer) = setup();
    let result = client.try_register_policy(&organizer, &2u64, &100i128, &9000u32, &500u32);
    assert!(result.is_err());
}

#[test]
fn test_policy_not_found_errors() {
    let (_env, client, _factory, _organizer) = setup();
    let result = client.try_get_policy(&999u64);
    assert!(result.is_err());
}

#[test]
fn test_max_resale_price_calculation() {
    let (_env, client, _factory, organizer) = setup();
    client.register_policy(&organizer, &3u64, &200i128, &11500u32, &500u32);
    let max_price = client.max_resale_price(&3u64);
    assert_eq!(max_price, 230i128); // 200 * 1.15
}
