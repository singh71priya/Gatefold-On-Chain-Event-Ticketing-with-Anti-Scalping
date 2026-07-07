import React from 'react';

const STATUS_STYLES = {
  valid: 'text-stamp border-stamp',
  checked_in: 'text-ink/40 border-ink/30',
  resold: 'text-accent border-accent',
};

/**
 * The signature UI element: a physical ticket stub rendered in the browser,
 * complete with a perforated tear line between the main body and the admit
 * stub, and a rotated ink-stamp once checked in. This is deliberately not a
 * generic "card" — it's built from the vernacular of a real paper ticket.
 */
export default function TicketStub({ eventName, ticketId, owner, faceValue, maxResalePrice, checkedIn, onAction, actionLabel, actionLoading }) {
  const truncatedOwner = owner ? `${owner.slice(0, 6)}…${owner.slice(-6)}` : '—';

  return (
    <div className="stub shadow-sm overflow-hidden flex flex-col sm:flex-row">
      <div className="flex-1 p-5 sm:p-6 relative">
        {checkedIn && (
          <div className="absolute top-4 right-4 stamp text-xs">Admitted</div>
        )}
        <p className="text-xs font-mono text-ink/50 uppercase tracking-wide">Ticket #{String(ticketId).padStart(4, '0')}</p>
        <h3 className="font-display text-2xl tracking-wide mt-1 text-ink">{eventName}</h3>
        <dl className="grid grid-cols-2 gap-y-2 mt-4 text-sm">
          <dt className="text-ink/50">Holder</dt>
          <dd className="font-mono text-ink text-right">{truncatedOwner}</dd>
          <dt className="text-ink/50">Face value</dt>
          <dd className="font-mono text-ink text-right">{faceValue?.toLocaleString()} tokens</dd>
          <dt className="text-ink/50">Resale cap</dt>
          <dd className="font-mono text-ink text-right">{maxResalePrice?.toLocaleString()} tokens</dd>
        </dl>
      </div>

      <div className="w-full sm:w-px sm:h-auto h-px stub-perforation bg-line shrink-0" aria-hidden="true" />

      <div className="w-full sm:w-40 shrink-0 p-5 sm:p-6 flex sm:flex-col items-center justify-between sm:justify-center gap-3 bg-paper/40">
        <span className={`pill ${STATUS_STYLES[checkedIn ? 'checked_in' : 'valid']}`}>
          {checkedIn ? 'Used' : 'Admit one'}
        </span>
        {onAction && (
          <button onClick={onAction} disabled={actionLoading} className="btn-primary text-xs w-full">
            {actionLoading ? 'Working…' : actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
