import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/http';
import { NasaDonkiService } from '@/modules/nasa/infrastructure/nasa-donki.service';

export async function GET() {
  try {
    const service = new NasaDonkiService();
    const events = await service.getNormalizedSolarEvents();
    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
