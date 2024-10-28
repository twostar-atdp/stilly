
// app/api/game/guess/route.ts
import { NextResponse } from 'next/server';
import { getTodayGame, makeGuess } from '@/lib/game';

export async function POST(request: Request) {
  try {
    const { guess } = await request.json();
    const currentGame = await getTodayGame();
    
    if (!currentGame || currentGame.isComplete || currentGame.attempts >= 6) {
      return NextResponse.json(
        { error: 'Game is not available or already complete' },
        { status: 400 }
      );
    }

    const updatedGame = await makeGuess(currentGame.id, guess);
    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error('Error processing guess:', error);
    return NextResponse.json(
      { error: 'Failed to process guess' },
      { status: 500 }
    );
  }
}