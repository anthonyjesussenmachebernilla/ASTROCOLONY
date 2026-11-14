import { DEFAULT_SIMULATION_CONFIG } from './resource-rules';
import type {
  BuildingId,
  MissionSimulationState,
  SimulationConfig,
} from './types';

export interface AstrobotMessage {
  mood: 'happy' | 'warning' | 'alert' | 'celebrate';
  title: string;
  message: string;
  tip: string;
}

export interface AstrobotStepGuide {
  stepNumber: 1 | 2 | 3 | 4;
  totalSteps: 4;
  stepLabel: string;
  instruction: string;
  suggestedBuilding?: BuildingId;
  highlightTarget: 'colony' | 'actions' | 'advance' | 'results';
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

export function getAstrobotStepGuide(
  state: MissionSimulationState,
  hasInspectedModule: boolean,
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
): AstrobotStepGuide {
  if (state.status !== 'IN_PROGRESS') {
    return {
      stepNumber: 4,
      totalSteps: 4,
      stepLabel: 'Misión terminada',
      instruction:
        state.status === 'VICTORY'
          ? '¡Lo lograste! Pulsa "Ver reporte y aprendizajes" para revisar tus resultados científicos.'
          : 'La misión terminó, pero así aprenden los ingenieros de NASA. Pulsa "Ver reporte y aprendizajes" o reinicia con otra estrategia.',
      highlightTarget: 'results',
    };
  }

  // Si ya usó todas sus decisiones del sol, el siguiente paso siempre es avanzar el sol
  if (state.actionsTakenThisTurn >= state.maxActionsPerTurn) {
    return {
      stepNumber: 4,
      totalSteps: 4,
      stepLabel: `Fin del Sol ${state.currentTurn}`,
      instruction:
        state.currentTurn >= state.maxTurns
          ? '¡Último paso! Pulsa el botón naranja "Terminar misión" para cerrar el Sol 10.'
          : `Ya tomaste tus ${state.maxActionsPerTurn} decisiones de este sol. Pulsa el botón naranja "Pasar al siguiente sol".`,
      highlightTarget: 'advance',
    };
  }

  // Paso 1 en Sol 1: invitar a tocar un edificio de la colonia 3D antes de decidir
  if (state.currentTurn === 1 && state.actionsTakenThisTurn === 0 && !hasInspectedModule) {
    return {
      stepNumber: 1,
      totalSteps: 4,
      stepLabel: 'Explora tu base 3D',
      instruction:
        'Haz clic en cualquier módulo de la colonia 3D (por ejemplo, el Invernadero o el Generador de O₂) para ver qué hace y qué necesita.',
      suggestedBuilding: 'GREENHOUSE',
      highlightTarget: 'colony',
    };
  }

  // Recomendación contextual según recursos bajos o evento activo
  const { energy, oxygen, radiationProtection, food } = state.resources;
  const t = config.lowThresholds;

  if (state.actionsTakenThisTurn === 0) {
    if (energy <= t.energy) {
      return {
        stepNumber: 2,
        totalSteps: 4,
        stepLabel: '¡Atiende la Energía!',
        instruction:
          'Tu energía está baja. Selecciona "Banco de baterías" o pulsa "Elegir esta acción" en "Ahorrar energía" abajo.',
        suggestedBuilding: 'BATTERIES',
        highlightTarget: 'actions',
      };
    }
    if (oxygen <= t.oxygen) {
      return {
        stepNumber: 2,
        totalSteps: 4,
        stepLabel: '¡Falta Oxígeno!',
        instruction:
          'El aire respirable está bajando. Elige "Producir oxígeno" en el Generador de O₂ o en el panel de abajo.',
        suggestedBuilding: 'OXYGEN_GENERATOR',
        highlightTarget: 'actions',
      };
    }
    if (radiationProtection <= t.radiationProtection || state.activeEvent?.type === 'SOLAR_EVENT') {
      return {
        stepNumber: 2,
        totalSteps: 4,
        stepLabel: 'Protege a la tripulación',
        instruction:
          'Tu escudo solar necesita refuerzo. Elige "Reforzar refugio" para proteger a los 4 astronautas de la radiación.',
        suggestedBuilding: 'RADIATION_SHELTER',
        highlightTarget: 'actions',
      };
    }
    if (food <= t.food) {
      return {
        stepNumber: 2,
        totalSteps: 4,
        stepLabel: 'Cultiva alimentos',
        instruction:
          'Quedan pocas raciones. Activa el "Invernadero" para producir comida fresca y un poco de oxígeno.',
        suggestedBuilding: 'GREENHOUSE',
        highlightTarget: 'actions',
      };
    }

    return {
      stepNumber: 2,
      totalSteps: 4,
      stepLabel: `Decisión 1 del Sol ${state.currentTurn}`,
      instruction:
        'Elige una decisión en el panel de abajo (o desde el módulo seleccionado). Si todo está estable, "Explorar Marte" suma ciencia para tu meta.',
      suggestedBuilding: 'SCIENCE_LAB',
      highlightTarget: 'actions',
    };
  }

  // Ya tomó 1 decisión de 2 posibles
  return {
    stepNumber: 3,
    totalSteps: 4,
    stepLabel: '¿Segunda decisión o avanzar?',
    instruction:
      '¡Bien! Ya tomaste 1 decisión. Puedes elegir una 2.ª acción si tienes energía suficiente, o pulsar "Pasar al siguiente sol" para ahorrar reservas.',
    highlightTarget: 'actions',
  };
}
