import React, { useState } from 'react';
import NavBar from './components/NavBar';
import Hero from './components/Hero';
import CreateEventForm from './components/CreateEventForm';
import BoxOffice from './components/BoxOffice';
import GateCheckIn from './components/GateCheckIn';
import EventFeed from './components/EventFeed';
import Banner from './components/Banner';
import { useWallet } from './hooks/useWallet';
import { useContractEvents } from './hooks/useContractEvents';
import { factoryClient } from './contracts/factoryClient';
import { CONTRACTS } from './contracts/config';

export default function App() {
  const wallet = useWallet();
  const { events, connected, error: eventError } = useContractEvents();

  const [view, setView] = useState('buy');
  const [event, setEvent] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleLookupEvent(eventId) {
    setError(null);
    setLoadingEvent(true);
    try {
      const result = await factoryClient.getEvent(eventId, wallet.address);
      setEvent(result);
      setTicket(null);
    } catch (err) {
      setError(`Could not load event #${eventId}. It may not exist, or contract IDs in config.js need updating. (${err.message})`);
      setEvent(null);
    } finally {
      setLoadingEvent(false);
    }
  }

  async function handleCreateEvent({ name, faceValue, totalTickets, maxResaleBps, royaltyBps }) {
    if (!wallet.isConnected) {
      setError('Connect a wallet first to publish an event.');
      return;
    }
    setError(null);
    setCreatingEvent(true);
    try {
      const { hash, returnValue } = await factoryClient.createEvent(
        wallet.address,
        name,
        CONTRACTS.TOKEN_CONTRACT_ID,
        CONTRACTS.REGISTRY_CONTRACT_ID,
        faceValue,
        totalTickets,
        maxResaleBps,
        royaltyBps,
        wallet.signTransaction
      );
      setSuccess(
        <span>
          Event published! Event ID: <strong>{returnValue?.toString() || 'Unknown'}</strong>. <br />
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            View transaction on Stellar Expert
          </a>
        </span>
      );
    } catch (err) {
      setError(`Failed to publish event: ${err.message}`);
    } finally {
      setCreatingEvent(false);
    }
  }

  async function handleMint(eventId) {
    if (!wallet.isConnected) {
      setError('Connect a wallet first.');
      return;
    }
    setError(null);
    setActionLoading(true);
    try {
      const { hash } = await factoryClient.mintTicket(eventId, wallet.address, wallet.signTransaction);
      const ev = await factoryClient.getEvent(eventId, wallet.address);
      const maxResalePrice = (Number(ev.face_value) * 11000) / 10000; // display estimate; registry has the source of truth
      setTicket({ ticketIdDisplay: ev.tickets_minted - 1, owner: wallet.address, maxResalePrice });
      setEvent(ev);
      setSuccess(`Ticket minted. Transaction: ${hash}`);
    } catch (err) {
      setError(`Mint failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResell(eventId, ticketId, buyer, price) {
    setError(null);
    setActionLoading(true);
    try {
      const { hash } = await factoryClient.resellTicket(eventId, ticketId, buyer, Number(price), wallet.signTransaction);
      setSuccess(`Ticket resold. Transaction: ${hash}`);
    } catch (err) {
      setError(`Resale failed — the price may exceed the organizer's cap. (${err.message})`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleVerifyEntry(eventId, ticketId) {
    setActionLoading(true);
    try {
      await factoryClient.verifyEntry(eventId, ticketId, wallet.address, wallet.signTransaction);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <NavBar wallet={wallet} view={view} onViewChange={setView} />
      {view === 'buy' && <Hero />}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 space-y-6">
        {(error || wallet.error) && <Banner type="error" message={error || wallet.error} onDismiss={() => setError(null)} />}
        {success && <Banner type="success" message={success} onDismiss={() => setSuccess(null)} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {view === 'buy' && (
              <BoxOffice
                wallet={wallet}
                onLookupEvent={handleLookupEvent}
                onMint={handleMint}
                onResell={handleResell}
                event={event}
                ticket={ticket}
                loadingEvent={loadingEvent}
                actionLoading={actionLoading}
              />
            )}

            {view === 'organizer' && (
              <CreateEventForm onCreate={handleCreateEvent} loading={creatingEvent} />
            )}

            {view === 'gate' && (
              <GateCheckIn onVerify={handleVerifyEntry} actionLoading={actionLoading} />
            )}
          </div>

          <div className="lg:col-span-1">
            <EventFeed events={events} connected={connected} error={eventError} />
          </div>
        </div>
      </main>

      <footer className="border-t border-line py-8 text-center">
        <p className="text-xs text-ink/40 font-mono">
          Gatefold · Soroban Testnet · Factory {CONTRACTS.FACTORY_CONTRACT_ID.slice(0, 6)}…{CONTRACTS.FACTORY_CONTRACT_ID.slice(-4)}
        </p>
      </footer>
    </div>
  );
}
