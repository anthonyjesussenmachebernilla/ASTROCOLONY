import { DEFAULT_SIMULATION_CONFIG } from './resource-rules';
import type { MissionSimulationState, SimulationConfig } from './types';

export interface AstrobotMessage {
  mood: 'happy' | 'warning' | 'alert' | 'celebrate';
  title: string;
  message: string;
  tip: string;
}

export function getAstrobotGuidance(
  state: MissionSimulationState,
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
): AstrobotMessage {
  if (state.status === 'VICTORY') {
    return {
      mood: 'celebrate',
      title: '¡Misión cumplida, Comandante!',
      message:
        state.outcomeReason ??
        'Lograste equilibrar energía, oxígeno y protección durante toda la misión.',
      tip: 'Prueba iniciar otra misión con una semilla distinta para experimentar nuevos eventos espaciales.',
    };
  }

  if (state.status === 'DEFEAT') {
    return {
      mood: 'alert',
      title: 'Alerta de emergencia en la colonia',
      message:
        state.outcomeReason ??
        'Un sistema vital se quedó sin reservas. En el espacio cada decisión cuenta.',
      tip: 'No te preocupes: los ingenieros de la NASA aprenden probando. Intenta otra estrategia cuidando más ese recurso.',
    };
  }

  const { energy, oxygen, radiationProtection, food, crewHealth } =
    state.resources;
  const t = config.lowThresholds;

  if (energy <= t.energy) {
    return {
      mood: 'alert',
      title: '¡Poca electricidad en baterías!',
      message:
        'Comandante, nuestra energía está baja. Si encendemos sistemas pesados ahora, podríamos quedarnos a oscuras en la noche marciana.',
      tip: 'Considera "Ahorrar electricidad", sabiendo que bajará un poco el oxígeno y las luces del invernadero.',
    };
  }

  if (oxygen <= t.oxygen) {
    return {
      mood: 'alert',
      title: '¡Oxígeno en nivel crítico!',
      message:
        'El aire respirable del hábitat está bajando demasiado. Sin oxígeno la tripulación no puede trabajar.',
      tip: 'Activa el generador de oxígeno o el invernadero, pero vigila que tengas suficiente energía.',
    };
  }

  if (radiationProtection <= t.radiationProtection) {
    return {
      mood: 'warning',
      title: 'Blindaje contra radiación debilitado',
      message:
        'Nuestro escudo antirradiación está bajo. Si llega una tormenta solar registrada por NASA DONKI, la tripulación correrá peligro.',
      tip: 'Refuerza la protección contra radiación antes de avanzar al siguiente sol.',
    };
  }

  if (food <= t.food) {
    return {
      mood: 'warning',
      title: 'Pocas raciones en la despensa',
      message:
        'Los alimentos se están acabando. Si llegan a cero, la salud de los 4 astronautas bajará cada sol.',
      tip: 'Activa el invernadero para producir comida fresca y un poco de oxígeno extra.',
    };
  }

  if (crewHealth <= t.crewHealth) {
    return {
      mood: 'warning',
      title: 'Tripulación cansada',
      message:
        'Nuestros astronautas necesitan mantenimiento médico y revisar los sellos del hábitat.',
      tip: 'Ejecuta "Reparar sistemas esenciales" si cuentas con energía y comida suficientes.',
    };
  }

  if (state.activeEvent) {
    return {
      mood: 'warning',
      title: `Evento activo: ${state.activeEvent.title}`,
      message: state.activeEvent.kidSummary,
      tip: state.activeEvent.engineeringLesson,
    };
  }

  if (state.currentTurn === 1 && state.actionsTakenThisTurn === 0) {
    return {
      mood: 'happy',
      title: '¡Bienvenido a AstroColony, Comandante!',
      message:
        'Tu misión es mantener viva nuestra base en Marte durante 10 soles. Puedes tomar hasta 2 decisiones por sol, pero ninguna es gratis.',
      tip: 'Haz clic en cualquier edificio de la colonia o en una tarjeta de acción para ver sus beneficios y costos.',
    };
  }

  return {
    mood: 'happy',
    title: `Sol ${state.currentTurn} de ${state.maxTurns} estable`,
    message:
      'Los sistemas funcionan bien. ¿Prefieres acumular reservas de seguridad o invertir energía en investigación científica?',
    tip: 'Recuerda: alcanzar 50 puntos de ciencia antes del Sol 10 logra una misión científica sobresaliente.',
  };
}
