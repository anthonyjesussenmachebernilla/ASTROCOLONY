import { NextRequest, NextResponse } from 'next/server';
import { ForbiddenError } from '@/lib/errors';
import { handleApiError } from '@/lib/http';
import { getAnonymousSessionId } from '@/lib/session';
import { AdvanceTurnSchema } from '@/modules/mission/application/dto/mission.dto';
import { AdvanceMissionTurnUseCase } from '@/modules/mission/application/use-cases/advance-mission-turn';
import { PrismaMissionRepository } from '@/modules/mission/infrastructure/repositories/prisma-mission.repository';
import { NasaDonkiService } from '@/modules/nasa/infrastructure/nasa-donki.service';

export async function POST(
  request: NextRequest,
  context: RouteContext<'/api/missions/[id]/advance'>,
) {
  try {
    const { id } = await context.params;
    const sessionId = await getAnonymousSessionId();
    if (!sessionId) {
      throw new ForbiddenError('No hay una sesión de juego activa.');
    }

    const body = await request.json().catch(() => ({}));
    const parsed = AdvanceTurnSchema.parse(body);

    const useCase = new AdvanceMissionTurnUseCase(
      new PrismaMissionRepository(),
      new NasaDonkiService(),
    );
    const result = await useCase.execute({
      missionId: id,
      sessionId,
      expectedVersion: parsed.expectedVersion,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
