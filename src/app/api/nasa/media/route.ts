import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/http';
import { NasaMediaService } from '@/modules/nasa/infrastructure/nasa-media.service';

export async function GET() {
  try {
    const service = new NasaMediaService();
    const [apod, marsPhotos] = await Promise.all([
      service.getApod(),
      service.getMarsImages(4),
    ]);
    return NextResponse.json({ apod, marsPhotos }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
