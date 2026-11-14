import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ForbiddenError } from '@/lib/errors';
import { handleApiError } from '@/lib/http';
import { getAnonymousSessionId } from '@/lib/session';
import { RescueMissionUseCase } from '@/modules/mission/application/use-cases/rescue-mission';
import { PrismaMissionRepository } from '@/modules/mission/infrastructure/repositories/prisma-mission.repository';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const sessionId = await getAnonymousSessionId();
    if (!sessionId) throw new ForbiddenError('No hay una sesión de juego activa.');
    const parsed = z.object({ expectedVersion: z.number().int().min(1) }).parse(await request.json());
    const result = await new RescueMissionUseCase(new PrismaMissionRepository()).execute({ missionId: id, sessionId, expectedVersion: parsed.expectedVersion });
    return NextResponse.json(result);
  } catch (error) { return handleApiError(error); }
}
