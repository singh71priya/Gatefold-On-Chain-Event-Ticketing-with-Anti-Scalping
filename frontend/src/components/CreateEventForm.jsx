import React, { useState } from 'react';

export default function CreateEventForm({ onCreate, loading }) {
  const [name, setName] = useState('');
  const [faceValue, setFaceValue] = useState('');
  const [totalTickets, setTotalTickets] = useState('');
  const [maxResalePct, setMaxResalePct] = useState('110');
  const [royaltyPct, setRoyaltyPct] = useState('5');

  const canSubmit = name && faceValue && totalTickets;

  return (
    <form
      className="stub p-5 sm:p-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onCreate({
          name,
          faceValue: Math.round(Number(faceValue) * 10000000), // convert XLM to stroops (7 decimals)
          totalTickets: Number(totalTickets),
          maxResaleBps: Math.round(Number(maxResalePct) * 100),
          royaltyBps: Math.round(Number(royaltyPct) * 100),
        });
      }}
    >
      <h3 className="font-display text-xl tracking-wide">List a new event</h3>

      <div>
        <label className="block text-xs text-ink/50 mb-1.5">Event name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Indie Rock Night"
          className="w-full bg-paper border border-line rounded-stub px-3 py-2 text-sm focus:border-accent/60 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-ink/50 mb-1.5">Face value</label>
          <input
            value={faceValue}
            onChange={(e) => setFaceValue(e.target.value)}
            type="number"
            min="0"
            placeholder="100"
            className="w-full bg-paper border border-line rounded-stub px-3 py-2 text-sm font-mono focus:border-accent/60 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-ink/50 mb-1.5">Total tickets</label>
          <input
            value={totalTickets}
            onChange={(e) => setTotalTickets(e.target.value)}
            type="number"
            min="1"
            placeholder="50"
            className="w-full bg-paper border border-line rounded-stub px-3 py-2 text-sm font-mono focus:border-accent/60 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-ink/50 mb-1.5">Max resale (% of face)</label>
          <input
            value={maxResalePct}
            onChange={(e) => setMaxResalePct(e.target.value)}
            type="number"
            min="100"
            className="w-full bg-paper border border-line rounded-stub px-3 py-2 text-sm font-mono focus:border-accent/60 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-ink/50 mb-1.5">Organizer royalty (%)</label>
          <input
            value={royaltyPct}
            onChange={(e) => setRoyaltyPct(e.target.value)}
            type="number"
            min="0"
            max="100"
            className="w-full bg-paper border border-line rounded-stub px-3 py-2 text-sm font-mono focus:border-accent/60 outline-none"
          />
        </div>
      </div>

      <button type="submit" disabled={!canSubmit || loading} className="btn-primary text-sm w-full">
        {loading ? 'Publishing…' : 'Publish event on-chain'}
      </button>
    </form>
  );
}
