import { Battery, FlaskConical, Home, Radio, Shield, Sprout, Sun, Wind } from 'lucide-react';
import type { BuildingId } from '@/modules/simulation/domain/types';

export const COLONY_BUILDINGS: { id: BuildingId; name: string; icon: typeof Home }[] = [
  { id: 'HABITAT', name: 'Hábitat principal', icon: Home },
  { id: 'OXYGEN_GENERATOR', name: 'Generador de oxígeno', icon: Wind },
  { id: 'SOLAR_PANELS', name: 'Paneles solares', icon: Sun },
  { id: 'BATTERIES', name: 'Baterías', icon: Battery },
  { id: 'GREENHOUSE', name: 'Invernadero', icon: Sprout },
  { id: 'SCIENCE_LAB', name: 'Laboratorio', icon: FlaskConical },
  { id: 'RADIATION_SHELTER', name: 'Refugio solar', icon: Shield },
  { id: 'COMMS_ANTENNA', name: 'Antena', icon: Radio },
];
