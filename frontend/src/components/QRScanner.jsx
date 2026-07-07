import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

/**
 * Camera-based QR scanner for the door-staff check-in flow. Falls back to
 * manual entry if camera access is denied — common on shared/kiosk devices.
 */
export default function QRScanner({ onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [manualEventId, setManualEventId] = useState('');
  const [manualTicketId, setManualTicketId] = useState('');

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startScanning() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);
      requestAnimationFrame(tick);
    } catch (err) {
      setCameraError('Camera unavailable. Use manual entry below.');
    }
  }

  function stopScanning() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setScanning(false);
  }

  function tick() {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      if (streamRef.current) requestAnimationFrame(tick);
      return;
    }
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      try {
        const payload = JSON.parse(code.data);
        if (payload.eventId !== undefined && payload.ticketId !== undefined) {
          stopScanning();
          onScan(payload);
          return;
        }
      } catch {
        /* not our payload format, keep scanning */
      }
    }
    if (streamRef.current) requestAnimationFrame(tick);
  }

  return (
    <div className="stub p-5 sm:p-6">
      <h3 className="font-display text-xl tracking-wide mb-3">Scan to admit</h3>

      {!scanning ? (
        <button onClick={startScanning} className="btn-primary text-sm w-full">
          Start camera
        </button>
      ) : (
        <div className="space-y-3">
          <video ref={videoRef} className="w-full rounded-stub border border-line" muted playsInline />
          <button onClick={stopScanning} className="btn-secondary text-sm w-full">
            Stop camera
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {cameraError && <p className="text-xs text-danger mt-2">{cameraError}</p>}

      <div className="mt-5 pt-4 border-t border-line">
        <p className="text-xs text-ink/50 mb-2">Or enter manually</p>
        <div className="flex gap-2">
          <input
            value={manualEventId}
            onChange={(e) => setManualEventId(e.target.value)}
            placeholder="Event ID"
            className="flex-1 bg-paper border border-line rounded-stub px-3 py-2 text-sm font-mono focus:border-accent/60 outline-none"
          />
          <input
            value={manualTicketId}
            onChange={(e) => setManualTicketId(e.target.value)}
            placeholder="Ticket ID"
            className="flex-1 bg-paper border border-line rounded-stub px-3 py-2 text-sm font-mono focus:border-accent/60 outline-none"
          />
          <button
            onClick={() => onScan({ eventId: manualEventId, ticketId: manualTicketId })}
            disabled={!manualEventId || !manualTicketId}
            className="btn-secondary text-sm"
          >
            Admit
          </button>
        </div>
      </div>
    </div>
  );
}
