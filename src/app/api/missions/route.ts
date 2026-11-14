import { NextRequest, NextResponse } from 'next/server';
import { attachSessionCookie, handleApiError } from '@/lib/http';
import { getOrCreateAnonymousSessionId } from '@/lib/session';
import { StartMissionSchema } from '@/modules/mission/application/dto/mission.dto';
import { StartMissionUseCase } from '@/modules/mission/application/use-cases/start-mission';
import { PrismaMissionRepository } from '@/modules/mission/infrastructure/repositories/prisma-mission.repository';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = StartMissionSchema.parse(body);
    const { sessionId, isNew } = await getOrCreateAnonymousSessionId();

    const useCase = new StartMissionUseCase(new PrismaMissionRepository());
    const result = await useCase.execute({
      sessionId,
      scenarioId: parsed.scenarioId,
      randomSeed: parsed.randomSeed,
    });

    const response = NextResponse.json(result, { status: 201 });
    return isNew ? attachSessionCookie(response, sessionId) : response;
  } catch (error) {
    return handleApiError(error);
  }
}
