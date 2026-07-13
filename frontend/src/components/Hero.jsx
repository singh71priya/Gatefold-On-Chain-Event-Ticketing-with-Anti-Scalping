import React from 'react';

export default function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
      <div className="max-w-2xl">
        <span className="pill border-accent/40 text-accent bg-accent-soft">Soroban · Testnet</span>
        <h1 className="font-display text-4xl sm:text-6xl tracking-wide mt-4 leading-[0.95] text-ink">
          THE TICKET REMEMBERS
          <span className="block text-accent">WHAT IT&apos;S WORTH.</span>
        </h1>
        <p className="text-ink/70 mt-4 text-base sm:text-lg leading-relaxed font-body">
          Every resale is checked against a price cap set by the organizer, on-chain, before it can go
          through. Scalpers can&apos;t list above the cap — and the organizer gets a cut of every resale, automatically.
        </p>
      </div>
    </section>
  );
}
