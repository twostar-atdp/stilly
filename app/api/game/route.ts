// app/api/game/route.ts
import { NextResponse } from 'next/server';
import { getTodayGame, initializeTodayGame } from '@/lib/game';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const headersList = headers();
  console.log('GET /api/game called');
  
  try {
    console.log('Attempting to get today\'s game...');
    let game = await getTodayGame();
    
    if (!game) {
      console.log('No game found, initializing new game...');
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

