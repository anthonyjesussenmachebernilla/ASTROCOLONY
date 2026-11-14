import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/http';
import { NasaDonkiService } from '@/modules/nasa/infrastructure/nasa-donki.service';

export async function GET() {
  try {
    const snapshot = await new NasaDonkiService().getSpaceWeatherSnapshot();
    return NextResponse.json({ snapshot }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
