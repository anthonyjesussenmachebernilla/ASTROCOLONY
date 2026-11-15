'use client';

import { useEffect, useRef } from 'react';

export default function GamePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyR') {
        event.preventDefault();
        if (!event.repeat) {
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'toggle-backpack' },
            window.location.origin,
          );
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

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
