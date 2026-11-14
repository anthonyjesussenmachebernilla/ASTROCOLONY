import { NextRequest, NextResponse } from 'next/server';
import { ForbiddenError } from '@/lib/errors';
import { handleApiError } from '@/lib/http';
import { getAnonymousSessionId } from '@/lib/session';
import { GetMissionStateUseCase } from '@/modules/mission/application/use-cases/get-mission-state';
import { PrismaMissionRepository } from '@/modules/mission/infrastructure/repositories/prisma-mission.repository';

export async function GET(
  _request: NextRequest,
  context: RouteContext<'/api/missions/[id]'>,
) {
  try {
    const { id } = await context.params;
    const sessionId = await getAnonymousSessionId();
    if (!sessionId) {
      throw new ForbiddenError('No hay una sesión de juego activa.');
    }

    const useCase = new GetMissionStateUseCase(new PrismaMissionRepository());
    const result = await useCase.execute({ missionId: id, sessionId });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
