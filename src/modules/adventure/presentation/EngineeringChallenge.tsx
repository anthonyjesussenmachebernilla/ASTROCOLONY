'use client';

import { useState } from 'react';
import { BatteryCharging, CheckCircle2, Lightbulb, ShieldCheck, Sun, Wind } from 'lucide-react';
import { solarCapture, type ChallengeId, type HelpMode } from '../domain/adventure';

export function EngineeringChallenge({ challenge, mode, onComplete }: { challenge: ChallengeId; mode: HelpMode; onComplete: () => void }) {
  const [angle, setAngle] = useState(0);
  const [switches, setSwitches] = useState([false, false, false]);
  const [leak, setLeak] = useState<number | null>(null);
  const [sealed, setSealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState('Puedes probar todas las veces que quieras.');
  const capture = solarCapture(angle);
  const powered = switches[0] && !switches[1] && switches[2];
  const verify = () => {
    const success = challenge === 'solar' ? capture === 100 : challenge === 'circuit' ? powered : leak === 1 && sealed;
    setSolved(success);
    setFeedback(success ? challenge === 'solar' ? '¡Encontraste la orientación que recibe más luz en esta práctica!' : challenge === 'circuit' ? '¡Las lámparas reciben electricidad! La batería puede alimentar los cultivos.' : '¡Fuga sellada! La lectura de presión se mantiene estable.' : challenge === 'solar' ? 'Todavía podemos captar más luz. Cambia el ángulo y compara la barra.' : challenge === 'circuit' ? switches[1] ? 'El calentador desvía la energía. ¿Podemos apagarlo y alimentar las lámparas?' : 'Falta completar el camino desde la batería hasta las lámparas.' : 'Compara las lecturas y sella el punto que está perdiendo presión.');
  };
  return <div className="adventure-workbench">
    <p className="adventure-note">Simulador de práctica · Sin cronómetro ni pérdida de recursos.</p>
    {challenge === 'solar' && <>
      <p>Mueve el panel y compara cuánta luz recibe.</p>
      <div className="adventure-solar-visual" aria-hidden="true"><Sun size={58} /><span className="adventure-sunbeam" /><div className="adventure-mini-panel" style={{ transform: `rotate(${60 - angle}deg)` }}><i /><i /><i /><i /><i /><i /></div></div>
      <label className="adventure-range">Orientación del panel: <strong>{angle}°</strong><input aria-label="Orientación del panel" type="range" min={0} max={90} step={15} value={angle} disabled={solved} onChange={(e) => setAngle(Number(e.target.value))} /></label>
      <label className="adventure-meter-label">Luz recibida en la práctica: {capture}%<meter min={0} max={100} value={capture} aria-label="Luz recibida" /></label>
      <p className="adventure-note">El ángulo ideal de este reto es inventado. En una misión real depende del lugar, la hora y la posición del Sol.</p>
    </>}
    {challenge === 'circuit' && <>
      <p>Conecta la batería con las lámparas. El calentador puede desviar la energía.</p>
      <div className={`adventure-circuit ${powered ? 'is-powered' : ''}`} aria-label={powered ? 'Circuito cerrado: lámparas encendidas' : 'Lámparas apagadas'}><BatteryCharging size={44} /><span /><Lightbulb size={44} /></div>
      <div className="adventure-switches">{['Batería', 'Desvío al calentador', 'Lámparas'].map((name, index) => <button type="button" key={name} role="switch" aria-checked={switches[index]} disabled={solved} onClick={() => setSwitches((values) => values.map((value, i) => i === index ? !value : value))}><span>{name}</span><strong>{switches[index] ? 'Encendido' : 'Apagado'}</strong></button>)}</div>
      {mode === 'guided' && <p className="adventure-hint"><Lightbulb size={18} />Necesitamos la batería y las lámparas encendidas. El calentador puede esperar.</p>}
    </>}
    {challenge === 'leak' && <>
      <p>El detector compara la pérdida de presión en tres puntos. Selecciona el lugar que necesita reparación.</p>
      <div className="adventure-leak-grid">{['Ventana', 'Sello de la puerta', 'Tubería'].map((name, index) => <button type="button" key={name} aria-pressed={leak === index} disabled={solved} onClick={() => { setLeak(index); setSealed(false); }}><Wind size={26} /><strong>{name}</strong><span>{index === 1 && !(leak === 1 && sealed) ? 'Pierde 8' : 'Pierde 0'} unidades de presión</span></button>)}</div>
      <button type="button" className="adventure-secondary" disabled={leak === null || solved} onClick={() => { setSealed(true); setFeedback(leak === 1 ? 'Parche colocado en el sello. Comprueba la presión.' : 'Aquí no había una fuga. Retira el parche y compara las otras lecturas.'); }}>Colocar parche</button>
      <p className="adventure-note">Las lecturas son unidades inventadas para aprender a comparar. Este ejercicio no consume el oxígeno de tu partida.</p>
    </>}
    <p role="status" className={`adventure-feedback ${solved ? 'is-success' : ''}`}>{solved && <CheckCircle2 size={20} />}{feedback}</p>
    {solved ? <button type="button" className="adventure-primary" onClick={onComplete}><ShieldCheck size={20} />Guardar descubrimiento</button> : <button type="button" className="adventure-primary" onClick={verify}>Comprobar mi solución</button>}
  </div>;
}
