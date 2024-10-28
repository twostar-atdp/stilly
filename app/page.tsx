// app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import GameBoard from './components/GameBoard';
import { GameState } from '@/lib/game';
import { Card, CardContent } from "@/components/ui/card";
import { Film } from 'lucide-react';

export default function Home() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGameState();
  }, []);

  const fetchGameState = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/game', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || `HTTP error! status: ${response.status}`
        );
      }
      
      const data = await response.json();
      setGameState(data);
    } catch (error) {
      console.error('Error fetching game state:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGuess = async (guess: string) => {
    try {
      const response = await fetch('/api/game/guess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guess }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || `HTTP error! status: ${response.status}`
        );
      }

      const updatedState = await response.json();
      setGameState(updatedState);
    } catch (error) {
      console.error('Error submitting guess:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit guess');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          background: 'linear-gradient(45deg, rgba(51, 65, 85, 0.1), rgba(100, 116, 139, 0.1))',
          backgroundSize: '400% 400%',
          animation: 'gradient 15s ease infinite'
        }}
      />

      <main className="relative container mx-auto p-4 pt-12">
        <div className="text-center mb-12">
          <h1 className="relative inline-flex flex-col items-center">
            <div className="flex items-center gap-3 mb-2">
              <Film className="w-12 h-12 text-indigo-400" />
              <span className="text-6xl md:text-7xl font-black text-white tracking-tight font-display">
                Stilly
              </span>
            </div>
            <span className="text-sm md:text-base text-zinc-400 font-medium font-sans">
              Daily Film Frame Challenge
            </span>
          </h1>
        </div>

        {loading ? (
          <Card className="max-w-2xl mx-auto bg-zinc-900/90 border-zinc-800">
            <CardContent className="flex justify-center p-6">
              <div className="text-zinc-400 animate-pulse flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="max-w-2xl mx-auto bg-zinc-900/90 border-zinc-800">
            <CardContent className="flex flex-col items-center p-6 space-y-4">
              <div className="text-red-400">
                {error}
              </div>
              <button 
                onClick={fetchGameState}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Try Again
              </button>
            </CardContent>
          </Card>
        ) : gameState ? (
          <GameBoard gameState={gameState} onGuess={handleGuess} />
        ) : (
          <Card className="max-w-2xl mx-auto bg-zinc-900/90 border-zinc-800">
            <CardContent className="flex justify-center p-6">
              <div className="text-red-400">
                No game state available • Please refresh
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}