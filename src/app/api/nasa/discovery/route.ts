import { NextResponse } from 'next/server';
import { NasaMediaService } from '@/modules/nasa/infrastructure/nasa-media.service';

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get('topic') !== 'solar-dust') {
    return NextResponse.json({ discovery: null }, { status: 400 });
  }
  const discovery = await new NasaMediaService().getSolarDustDiscovery();
  return NextResponse.json({ discovery }, { status: discovery ? 200 : 503 });
}
