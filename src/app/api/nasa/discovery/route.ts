import { NextResponse } from 'next/server';
import { NasaMediaService } from '@/modules/nasa/infrastructure/nasa-media.service';
import { isDiscoveryTopic } from '@/data/scientific-sources/mars-discoveries';

export async function GET(request: Request) {
  const topic = new URL(request.url).searchParams.get('topic');
  if (!isDiscoveryTopic(topic)) {
    return NextResponse.json({ discovery: null }, { status: 400 });
  }
  const discovery = await new NasaMediaService().getDiscovery(topic);
  return NextResponse.json({ discovery }, { status: discovery ? 200 : 503 });
}
