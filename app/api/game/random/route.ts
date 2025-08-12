import { NextResponse } from 'next/server';
import { getRandomGameWithScreenshot } from '@/lib/curated-games-loader';

export async function GET() {
  try {
    const gameData = await getRandomGameWithScreenshot();
    
    return NextResponse.json(gameData);
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch game' },
      { status: 500 }
    );
  }
}