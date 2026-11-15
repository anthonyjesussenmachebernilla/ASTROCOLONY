'use client';

import { useRef } from 'react';

export default function GamePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <main className="fixed inset-0 bg-[#15181b]">
      <iframe
        ref={iframeRef}
        title="HORIZONTE · Colonia Aurora-1"
        src="/horizonte/index.html?autostart=1"
        className="h-full w-full border-0"
        allow="fullscreen"
        onLoad={() => iframeRef.current?.focus()}
      />
    </main>
  );
}
