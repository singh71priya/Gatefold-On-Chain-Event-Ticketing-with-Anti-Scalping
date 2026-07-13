import React, { useState } from 'react';
import TicketStub from './TicketStub';
import TicketQRCode from './TicketQRCode';
import Skeleton from './Skeleton';

export default function BoxOffice({ wallet, onLookupEvent, onMint, onResell, event, ticket, loadingEvent, actionLoading }) {
  const [eventId, setEventId] = useState('');
  const [resalePrice, setResalePrice] = useState('');
  const [resaleBuyer, setResaleBuyer] = useState('');

  return (
    <div className="space-y-6">
      <div className="stub p-5 sm:p-6">
        <h3 className="font-display text-xl tracking-wide mb-3">Find an event</h3>
        <div className="flex gap-2">
          <input
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Event ID (e.g. 0)"
            className="flex-1 bg-paper border border-line rounded-stub px-3 py-2 text-sm font-mono focus:border-accent/60 outline-none"
          />
          <button onClick={() => onLookupEvent(eventId)} disabled={!eventId} className="btn-secondary text-sm">
            Look up
          </button>
        </div>
      </div>

      {loadingEvent && <Skeleton />}

      {event && !loadingEvent && (
        <div className="stub p-5 sm:p-6 space-y-3">
          <h3 className="font-display text-xl tracking-wide">{event.name}</h3>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-ink/50">Face value</dt>
            <dd className="font-mono text-right">{Number(event.face_value) / 10000000} XLM</dd>
            <dt className="text-ink/50">Minted</dt>
            <dd className="font-mono text-right">
              {event.tickets_minted} / {event.total_tickets}
            </dd>
          </dl>
          <button
            onClick={() => onMint(eventId)}
            disabled={actionLoading || event.tickets_minted >= event.total_tickets}
            className="btn-primary text-sm w-full"
          >
            {actionLoading ? 'Minting…' : event.tickets_minted >= event.total_tickets ? 'Sold out' : 'Buy ticket at face value'}
          </button>
        </div>
      )}

      {ticket && (
        <div className="space-y-4">
          <TicketStub
            eventName={event?.name}
            ticketId={ticket.ticketIdDisplay}
            owner={ticket.owner}
            faceValue={Number(event?.face_value) / 10000000}
            maxResalePrice={ticket.maxResalePrice / 10000000}
          />
          <div className="stub p-5 sm:p-6 flex flex-col sm:flex-row gap-6 items-center">
            <TicketQRCode eventId={eventId} ticketId={ticket.ticketIdDisplay} />
            <div className="flex-1 w-full space-y-2">
              <p className="text-xs text-ink/50">Resell this ticket (capped at {ticket.maxResalePrice / 10000000} XLM)</p>
              <div className="flex gap-2">
                <input
                  value={resaleBuyer}
                  onChange={(e) => setResaleBuyer(e.target.value)}
                  placeholder="Buyer address"
                  className="flex-1 bg-paper border border-line rounded-stub px-3 py-2 text-sm font-mono focus:border-accent/60 outline-none"
                />
                <input
                  value={resalePrice}
                  onChange={(e) => setResalePrice(e.target.value)}
                  placeholder="Price"
                  type="number"
                  className="w-28 bg-paper border border-line rounded-stub px-3 py-2 text-sm font-mono focus:border-accent/60 outline-none"
                />
              </div>
              <button
                onClick={() => onResell(eventId, ticket.ticketIdDisplay, resaleBuyer, resalePrice)}
                disabled={actionLoading || !resaleBuyer || !resalePrice}
                className="btn-secondary text-sm w-full"
              >
                {actionLoading ? 'Processing…' : 'Resell ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!wallet.isConnected && (
        <p className="text-xs text-ink/50 text-center">Connect a wallet to buy or resell tickets.</p>
      )}
    </div>
  );
}
