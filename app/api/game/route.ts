import { NextResponse } from 'next/server';
import { getTodayGame, initializeTodayGame } from '@/lib/game';

export async function GET() {
  try {
    let game = await getTodayGame();
    
    if (!game) {
      game = await initializeTodayGame();
    }
    
    return NextResponse.json(game);
  } catch (error) {
    console.error('Error in /api/game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    );
  }
}