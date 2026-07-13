//! Ticket Factory Contract
//!
//! Mints NFT-style event tickets (one token per seat/admission) and owns the
//! full lifecycle: mint, resale, entry check-in. Every resale makes a
//! cross-contract call into the ResaleRegistry contract, which enforces the
//! organizer's price cap and computes the royalty owed back to them. Entry
//! verification is a one-way state flip (`checked_in`) so a ticket cannot be
//! used twice, powering a live check-in feed for the door staff.

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, String};

mod registry {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/resale_registry.wasm"
    );
}

#[contracttype]
#[derive(Clone)]
pub struct Event {
    pub organizer: Address,
    pub name: String,
    pub token: Address,
    pub face_value: i128,
    pub registry: Address,
    pub total_tickets: u32,
    pub tickets_minted: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct Ticket {
    pub event_id: u64,
    pub owner: Address,
    pub checked_in: bool,
    pub minted_at: u64,
}

#[contracttype]
pub enum DataKey {
    Event(u64),
    Ticket(u64, u64), // (event_id, ticket_id)
    NextEventId,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum FactoryError {
    EventNotFound = 1,
    TicketNotFound = 2,
    SoldOut = 3,
    Unauthorized = 4,
    AlreadyCheckedIn = 5,
    NotTicketOwner = 6,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct EventCreated {
    pub event_id: u64,
    pub organizer: Address,
    pub face_value: i128,
    pub total_tickets: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TicketMinted {
    pub event_id: u64,
    pub ticket_id: u64,
    pub owner: Address,
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

#[contracttype]
#[derive(Clone, Debug)]
pub struct EntryVerified {
    pub event_id: u64,
    pub ticket_id: u64,
    pub attendee: Address,
}

#[contract]
pub struct TicketFactoryContract;

#[contractimpl]
impl TicketFactoryContract {
    /// Organizer creates an event. Also registers the pricing policy on the
    /// Registry contract in the same call (cross-contract call #1).
    pub fn create_event(
        env: Env,
        organizer: Address,
        name: String,
        token: Address,
        registry: Address,
        face_value: i128,
        total_tickets: u32,
        max_resale_bps: u32,
        royalty_bps: u32,
    ) -> Result<u64, FactoryError> {
        organizer.require_auth();

        let event_id: u64 = env.storage().instance().get(&DataKey::NextEventId).unwrap_or(0);
        env.storage().instance().set(&DataKey::NextEventId, &(event_id + 1));

        let event = Event {
            organizer: organizer.clone(),
            name,
            token,
            face_value,
            registry: registry.clone(),
            total_tickets,
            tickets_minted: 0,
        };
        env.storage().persistent().set(&DataKey::Event(event_id), &event);

        // Cross-contract call: Factory -> Registry, registers the anti-scalping policy.
        let registry_client = registry::Client::new(&env, &registry);
        registry_client.register_policy(&organizer, &event_id, &face_value, &max_resale_bps, &royalty_bps);

        env.events().publish(
            (symbol_short!("EventCre"), event_id),
            EventCreated { event_id, organizer, face_value, total_tickets },
        );
        Ok(event_id)
    }

    /// Mint a ticket at face value to `buyer`. Buyer pays the organizer directly.
    pub fn mint_ticket(env: Env, event_id: u64, buyer: Address) -> Result<u64, FactoryError> {
        buyer.require_auth();
        let mut event = Self::load_event(&env, event_id)?;

        if event.tickets_minted >= event.total_tickets {
            return Err(FactoryError::SoldOut);
        }

        let token_client = token::Client::new(&env, &event.token);
        token_client.transfer(&buyer, &event.organizer, &event.face_value);

        let ticket_id = event.tickets_minted as u64;
        let ticket = Ticket { event_id, owner: buyer.clone(), checked_in: false, minted_at: env.ledger().timestamp() };
        env.storage().persistent().set(&DataKey::Ticket(event_id, ticket_id), &ticket);

        event.tickets_minted += 1;
        env.storage().persistent().set(&DataKey::Event(event_id), &event);

        env.events().publish(
            (symbol_short!("TicketMin"), event_id, ticket_id),
            TicketMinted { event_id, ticket_id, owner: buyer },
        );
        Ok(ticket_id)
    }

    /// Resell a ticket. Makes a cross-contract call into the Registry to
    /// validate the price cap and compute the royalty, then executes both
    /// the buyer->seller payment and the royalty payment to the organizer.
    pub fn resell_ticket(
        env: Env,
        event_id: u64,
        ticket_id: u64,
        buyer: Address,
        sale_price: i128,
    ) -> Result<(), FactoryError> {
        buyer.require_auth();
        let event = Self::load_event(&env, event_id)?;
        let mut ticket = Self::load_ticket(&env, event_id, ticket_id)?;
        let seller = ticket.owner.clone();

        // Cross-contract call: Factory -> Registry, enforces price cap and returns royalty owed.
        let registry_client = registry::Client::new(&env, &event.registry);
        let royalty: i128 =
            registry_client.check_and_record_resale(&event_id, &ticket_id, &seller, &buyer, &sale_price);

        let token_client = token::Client::new(&env, &event.token);
        let seller_take = sale_price - royalty;
        token_client.transfer(&buyer, &seller, &seller_take);
        if royalty > 0 {
            token_client.transfer(&buyer, &event.organizer, &royalty);
        }

        ticket.owner = buyer.clone();
        env.storage().persistent().set(&DataKey::Ticket(event_id, ticket_id), &ticket);

        env.events().publish(
            (symbol_short!("TicketRes"), event_id, ticket_id),
            TicketResold { event_id, ticket_id, seller, buyer, sale_price, royalty_paid: royalty },
        );
        Ok(())
    }

    /// Door staff calls this to check a ticket in. One-way flip; cannot be reused.
    pub fn verify_entry(env: Env, event_id: u64, ticket_id: u64, staff: Address) -> Result<(), FactoryError> {
        staff.require_auth();
        let event = Self::load_event(&env, event_id)?;
        if staff != event.organizer {
            return Err(FactoryError::Unauthorized);
        }

        let mut ticket = Self::load_ticket(&env, event_id, ticket_id)?;
        if ticket.checked_in {
            return Err(FactoryError::AlreadyCheckedIn);
        }
        ticket.checked_in = true;
        let attendee = ticket.owner.clone();
        env.storage().persistent().set(&DataKey::Ticket(event_id, ticket_id), &ticket);

        env.events().publish(
            (symbol_short!("EntryVer"), event_id, ticket_id),
            EntryVerified { event_id, ticket_id, attendee },
        );
        Ok(())
    }

    pub fn get_event(env: Env, event_id: u64) -> Result<Event, FactoryError> {
        Self::load_event(&env, event_id)
    }

    pub fn get_ticket(env: Env, event_id: u64, ticket_id: u64) -> Result<Ticket, FactoryError> {
        Self::load_ticket(&env, event_id, ticket_id)
    }

    fn load_event(env: &Env, event_id: u64) -> Result<Event, FactoryError> {
        env.storage().persistent().get(&DataKey::Event(event_id)).ok_or(FactoryError::EventNotFound)
    }

    fn load_ticket(env: &Env, event_id: u64, ticket_id: u64) -> Result<Ticket, FactoryError> {
        env.storage()
            .persistent()
            .get(&DataKey::Ticket(event_id, ticket_id))
            .ok_or(FactoryError::TicketNotFound)
    }
}

mod test;
