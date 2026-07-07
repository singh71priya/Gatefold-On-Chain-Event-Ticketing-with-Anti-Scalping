import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

/**
 * Renders a scannable QR code encoding the ticket's check-in payload
 * (event id + ticket id). Door staff scan this with the Check-in view.
 */
export default function TicketQRCode({ eventId, ticketId }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const payload = JSON.stringify({ eventId, ticketId });
    QRCode.toCanvas(canvasRef.current, payload, {
      width: 160,
      margin: 1,
      color: { dark: '#1F2A24', light: '#F6F1E4' },
    }).catch(() => {});
  }, [eventId, ticketId]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="rounded-stub border border-line" />
      <span className="text-[11px] font-mono text-ink/50">Scan at the gate</span>
    </div>
  );
}
