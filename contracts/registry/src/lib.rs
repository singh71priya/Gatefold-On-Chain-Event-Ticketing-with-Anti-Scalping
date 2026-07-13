//! Resale Registry Contract
//!
//! Anti-scalping enforcement layer. The TicketFactory contract calls into
//! this contract cross-contract on every ticket transfer. The registry:
//!   - caps the resale price at a percentage of face value (e.g. 110%)
//!   - computes and records the organizer's royalty cut of any resale
//!   - keeps a full resale history per ticket for transparency
//!
//! This contract never moves tokens itself — it is a pricing/authorization
//! oracle. The Factory contract (or frontend, for a token-based flow) is
//! responsible for actually executing the payment based on the numbers this
//! registry returns.

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Vec};

#[contracttype]
#[derive(Clone)]
pub struct EventPolicy {
    pub organizer: Address,
    pub face_value: i128,
    pub max_resale_bps: u32,   // e.g. 11000 = 110% of face value
    pub royalty_bps: u32,      // e.g. 500 = 5% of resale price to organizer
}

#[contracttype]
#[derive(Clone)]
pub struct ResaleRecord {
    pub seller: Address,
    pub buyer: Address,
    pub sale_price: i128,
    pub royalty_paid: i128,
    pub ledger_timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Policy(u64),              // event_id -> EventPolicy
    ResaleHistory(u64, u64),  // (event_id, ticket_id) -> Vec<ResaleRecord>
    AuthorizedFactory,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RegistryError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    PolicyNotFound = 3,
    PriceExceedsCap = 4,
    Unauthorized = 5,
    InvalidBps = 6,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PolicyRegistered {
    pub event_id: u64,
    pub organizer: Address,
    pub face_value: i128,
    pub max_resale_bps: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TicketResold {
    pub event_id: u64,
    pub ticket_id: u64,
    pub seller: Address,
    pub buyer: Address,
    pub sale_price: i128,
    pub royalty_paid: i128,
}

#[contract]
pub struct ResaleRegistryContract;

#[contractimpl]
impl ResaleRegistryContract {
    /// Set the single Factory contract permitted to call `check_and_record_resale`.
    pub fn initialize(env: Env, factory: Address) -> Result<(), RegistryError> {
        if env.storage().instance().has(&DataKey::AuthorizedFactory) {
            return Err(RegistryError::AlreadyInitialized);
        }
        factory.require_auth();
        env.storage().instance().set(&DataKey::AuthorizedFactory, &factory);
        Ok(())
    }

    /// Organizer registers pricing policy for an event when it's created.
    pub fn register_policy(
        env: Env,
        organizer: Address,
        event_id: u64,
        face_value: i128,
        max_resale_bps: u32,
        royalty_bps: u32,
    ) -> Result<(), RegistryError> {
        organizer.require_auth();
        if royalty_bps > 10_000 || max_resale_bps < 10_000 {
            return Err(RegistryError::InvalidBps);
        }

        let policy = EventPolicy { organizer: organizer.clone(), face_value, max_resale_bps, royalty_bps };
        env.storage().persistent().set(&DataKey::Policy(event_id), &policy);

        env.events().publish(
            (symbol_short!("PolicyReg"), event_id),
            PolicyRegistered { event_id, organizer, face_value, max_resale_bps },
        );
        Ok(())
    }

    /// Called cross-contract by the Factory on every resale. Validates the
    /// price against the cap, computes the organizer royalty, and records
    /// the resale in history. Returns the royalty amount owed to the
    /// organizer so the Factory (or frontend) can route payment.
    pub fn check_and_record_resale(
        env: Env,
        event_id: u64,
        ticket_id: u64,
        seller: Address,
        buyer: Address,
        sale_price: i128,
    ) -> Result<i128, RegistryError> {
        let factory: Address = env
            .storage()
            .instance()
            .get(&DataKey::AuthorizedFactory)
            .ok_or(RegistryError::NotInitialized)?;
        factory.require_auth();

        let policy: EventPolicy = env
            .storage()
            .persistent()
            .get(&DataKey::Policy(event_id))
            .ok_or(RegistryError::PolicyNotFound)?;

        let max_price = (policy.face_value * policy.max_resale_bps as i128) / 10_000;
        if sale_price > max_price {
            return Err(RegistryError::PriceExceedsCap);
        }

        let royalty_paid = (sale_price * policy.royalty_bps as i128) / 10_000;

        let key = DataKey::ResaleHistory(event_id, ticket_id);
        let mut history: Vec<ResaleRecord> = env.storage().persistent().get(&key).unwrap_or(Vec::new(&env));
        history.push_back(ResaleRecord {
            seller: seller.clone(),
            buyer: buyer.clone(),
            sale_price,
            royalty_paid,
            ledger_timestamp: env.ledger().timestamp(),
        });
        env.storage().persistent().set(&key, &history);

        env.events().publish(
            (symbol_short!("TicketRes"), event_id, ticket_id),
            TicketResold { event_id, ticket_id, seller, buyer, sale_price, royalty_paid },
        );
        Ok(royalty_paid)
    }

    pub fn get_policy(env: Env, event_id: u64) -> Result<EventPolicy, RegistryError> {
        env.storage().persistent().get(&DataKey::Policy(event_id)).ok_or(RegistryError::PolicyNotFound)
    }

    pub fn get_resale_history(env: Env, event_id: u64, ticket_id: u64) -> Vec<ResaleRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::ResaleHistory(event_id, ticket_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn max_resale_price(env: Env, event_id: u64) -> Result<i128, RegistryError> {
        let policy: EventPolicy = env
            .storage()
            .persistent()
            .get(&DataKey::Policy(event_id))
            .ok_or(RegistryError::PolicyNotFound)?;
        Ok((policy.face_value * policy.max_resale_bps as i128) / 10_000)
    }
}

mod test;
