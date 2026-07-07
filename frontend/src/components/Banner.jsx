import React from 'react';

export default function Banner({ type = 'error', message, onDismiss }) {
  if (!message) return null;
  const styles = type === 'error'
    ? 'border-danger/40 bg-danger/10 text-danger'
    : 'border-stamp/40 bg-stamp/10 text-stamp';

  return (
    <div className={`border rounded-stub px-4 py-3 text-sm flex items-start justify-between gap-3 ${styles}`}>
      <span className="leading-relaxed">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
