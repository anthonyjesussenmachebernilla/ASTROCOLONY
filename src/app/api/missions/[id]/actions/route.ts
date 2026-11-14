import { NextRequest, NextResponse } from 'next/server';
import { ForbiddenError } from '@/lib/errors';
import { handleApiError } from '@/lib/http';
import { getAnonymousSessionId } from '@/lib/session';
import { ExecuteActionSchema } from '@/modules/mission/application/dto/mission.dto';
import { ExecutePlayerActionUseCase } from '@/modules/mission/application/use-cases/execute-player-action';
import { PrismaMissionRepository } from '@/modules/mission/infrastructure/repositories/prisma-mission.repository';

export async function POST(
  request: NextRequest,
  context: RouteContext<'/api/missions/[id]/actions'>,
) {
  try {
    const { id } = await context.params;
    const sessionId = await getAnonymousSessionId();
    if (!sessionId) {
      throw new ForbiddenError('No hay una sesión de juego activa.');
    }

    const body = await request.json();
    const parsed = ExecuteActionSchema.parse(body);

    const useCase = new ExecutePlayerActionUseCase(
      new PrismaMissionRepository(),
    );
    const result = await useCase.execute({
      missionId: id,
      sessionId,
      actionType: parsed.actionType,
      expectedVersion: parsed.expectedVersion,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
