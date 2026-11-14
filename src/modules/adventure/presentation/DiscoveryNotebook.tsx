'use client';

import { useState } from 'react';
import { Award, BookOpen, ExternalLink, FlaskConical, LockKeyhole } from 'lucide-react';
import type { MissionSimulationState } from '@/modules/simulation/domain/types';
import { ADVENTURE_SOURCES, type AdventureProgress, type ChallengeId } from '../domain/adventure';

export function DiscoveryNotebook({ mission, progress, onClassify, onPractice }: { mission: MissionSimulationState; progress: AdventureProgress; onClassify: () => void; onPractice: (id: ChallengeId) => void }) {
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('Una pista puede tener varias explicaciones.');
  const cultivated = mission.actionHistory.some((a) => a.actionType === 'ACTIVATE_GREENHOUSE' && mission.currentTurn > a.turn);
  const researched = mission.actionHistory.some((a) => a.actionType === 'CONDUCT_RESEARCH');
  const unlockedMystery = cultivated && progress.completed.includes('leak') && researched;
  const classify = (index: number, answer: string) => {
    if (answer !== (index === 0 ? 'observed' : 'hypothesis')) { setFeedback('Miremos otra vez: medir algo es observar. Explicar de dónde viene es una hipótesis. Prueba de nuevo.'); return; }
    const next = [...new Set([...answers, String(index)])]; setAnswers(next);
    setFeedback(next.length === 2 ? '¡Piensas como una persona científica! Necesitamos más pruebas para conocer el origen de la muestra.' : '¡Correcto! Ahora clasifica la otra frase.');
    if (next.length === 2) onClassify();
  };
  return <div className="adventure-notebook">
    <p>Las páginas se abren con tus descubrimientos. La aventura se guarda en este navegador.</p>
    <article><div className="adventure-card-heading"><BookOpen size={21} /><h3>Las plantas también viajan</h3></div>{cultivated ? <><span className="adventure-tag">Observación documentada</span><p>NASA cultiva plantas en la estación espacial. El sistema Veggie utiliza luces LED para ayudar a crecer a los cultivos.</p><a href={ADVENTURE_SOURCES.plants} target="_blank" rel="noreferrer">Leer en NASA <ExternalLink size={14} /></a><p className="adventure-note">Nuestro invernadero de Marte y sus cosechas rápidas son una simulación educativa. No representan una base real.</p></> : <p className="adventure-locked"><LockKeyhole size={18} />Enciende el invernadero y observa el siguiente sol.</p>}</article>
    <article><div className="adventure-card-heading"><FlaskConical size={21} /><h3>El mensaje de la baliza</h3></div>{unlockedMystery ? <><span className="adventure-tag is-fiction">Historia inventada</span><p>La baliza Aurora dejó un mensaje: «Encontramos una muestra interesante. No sabemos cómo se formó. Sigue buscando pruebas».</p><span className="adventure-tag">Observación documentada</span><p>Perseverance encontró moléculas orgánicas en rocas de Marte. Eso, por sí solo, no confirma que haya existido vida.</p><a href={ADVENTURE_SOURCES.organics} target="_blank" rel="noreferrer">Ver el descubrimiento NASA <ExternalLink size={14} /></a>
      <h4>Clasifica las notas de nuestra muestra ficticia</h4>{['El instrumento detectó compuestos en la muestra.', 'Estos compuestos podrían tener un origen biológico.'].map((statement, index) => <div className="adventure-classification" key={statement}><p>{statement}</p>{answers.includes(String(index)) || progress.classifiedEvidence ? <strong>✓ {index === 0 ? 'Observación' : 'Hipótesis sin verificar'}</strong> : <div><button type="button" onClick={() => classify(index, 'observed')}>Observación</button><button type="button" onClick={() => classify(index, 'hypothesis')}>Hipótesis</button></div>}</div>)}<p role="status" className="adventure-feedback">{feedback}</p></> : <p className="adventure-locked"><LockKeyhole size={18} />Observa la cosecha, resuelve la fuga y realiza una investigación.</p>}</article>
    <div className="adventure-card-heading"><Award size={23} /><h3>Lo que aprendiste</h3></div>
    <div className="adventure-badges">{([{ id: 'solar', label: 'Cazaluz' }, { id: 'circuit', label: 'Ingeniería de cultivos' }, { id: 'leak', label: 'Detective de fugas' }] as const).map(({ id, label }) => <button type="button" key={id} onClick={() => onPractice(id)}><Award size={24} /><strong>{label}</strong><span>{progress.completed.includes(id) ? 'Conseguido · Repetir' : 'Practicar'}</span></button>)}</div>
    {progress.classifiedEvidence && <p className="adventure-hint"><Award size={24} />Insignia: detective de evidencias. ¡Una buena pregunta también es un descubrimiento!</p>}
  </div>;
}
