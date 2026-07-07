import React, { useState } from 'react';
import QRScanner from './QRScanner';
import Banner from './Banner';

export default function GateCheckIn({ onVerify, actionLoading }) {
  const [lastResult, setLastResult] = useState(null);

  async function handleScan(payload) {
    try {
      await onVerify(payload.eventId, payload.ticketId);
      setLastResult({ type: 'success', message: `Ticket #${payload.ticketId} admitted.` });
    } catch (err) {
      setLastResult({ type: 'error', message: `Could not admit ticket: ${err.message}` });
    }
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <QRScanner onScan={handleScan} />
      {actionLoading && <p className="text-xs text-ink/50 text-center">Verifying on-chain…</p>}
      {lastResult && (
        <Banner
          type={lastResult.type === 'success' ? 'success' : 'error'}
          message={lastResult.message}
          onDismiss={() => setLastResult(null)}
        />
      )}
    </div>
  );
}
