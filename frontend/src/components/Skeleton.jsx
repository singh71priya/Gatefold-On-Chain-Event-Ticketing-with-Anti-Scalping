import React from 'react';

export default function Skeleton() {
  return (
    <div className="stub p-6 space-y-4 animate-pulse" role="status" aria-label="Loading ticket data">
      <div className="h-4 w-32 bg-line rounded" />
      <div className="h-6 w-48 bg-line rounded" />
      <div className="h-20 bg-line/60 rounded-stub" />
    </div>
  );
}
