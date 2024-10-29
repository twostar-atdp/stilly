import { NextResponse } from 'next/server';
import { getTodayGame, makeGuess } from '@/lib/game';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { guess, sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!guess || typeof guess !== 'string') {
      return NextResponse.json(
        { error: 'Valid guess is required' },
        { status: 400 }
      );
    }
    
    const currentGame = await getTodayGame(sessionId);
    
    if (!currentGame) {
      return NextResponse.json(
        { error: 'No active game found' },
        { status: 404 }
      );
    }

    if (currentGame.isComplete) {
      return NextResponse.json(
        { error: 'Game is already complete' },
        { status: 400 }
      );
    }

    if (currentGame.attempts >= 6) {
      return NextResponse.json(
        { error: 'Maximum attempts reached' },
        { status: 400 }
      );
    }

    const updatedGame = await makeGuess(sessionId, guess);
    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error('Error processing guess:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process guess',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}