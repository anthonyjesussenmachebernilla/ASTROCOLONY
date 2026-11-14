'use client';

import { useEffect } from 'react';
import { useAdventureStore } from '@/stores/adventure.store';

export function ExplorerPreferences() {
  const { helpMode, narration, setHelpMode, setNarration, load } = useAdventureStore();
  useEffect(() => { load(); }, [load]);
  return <fieldset className="mt-5 rounded-xl border border-cyan-300/30 p-4 text-left text-sm text-slate-100"><legend className="px-2 font-bold text-cyan-200">Tu forma de explorar</legend><div className="grid gap-2 sm:grid-cols-2">{([{ mode: 'guided', label: 'Con compañía', text: 'Astrobot explica cada paso.' }, { mode: 'explorer', label: 'Por mi cuenta', text: 'Tú investigas y pides pistas.' }] as const).map(({ mode, label, text }) => <label key={mode} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${helpMode === mode ? 'border-cyan-300 bg-cyan-900/30' : 'border-slate-600'}`}><input className="mt-1 h-5 w-5 shrink-0 accent-cyan-300" type="radio" name="help-mode" value={mode} checked={helpMode === mode} onChange={() => setHelpMode(mode)} /><span><strong className="block">{label}</strong><span className="mt-1 block text-xs text-slate-300">{text}</span></span></label>)}</div><label className="mt-4 flex cursor-pointer items-center gap-3"><input type="checkbox" checked={narration} onChange={(e) => setNarration(e.target.checked)} className="h-5 w-5 accent-cyan-300" />Activar botones de lectura en voz alta</label><p className="mt-3 text-xs text-slate-300">Puedes cambiar estas ayudas durante la misión. La voz depende de tu navegador.</p></fieldset>;
}
