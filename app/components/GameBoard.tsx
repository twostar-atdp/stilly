"use client";

import React, { useState, FormEvent } from 'react';
import { GameState } from '@/lib/game';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Tag, Star } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface GameBoardProps {
  gameState: GameState;
  onGuess: (guess: string) => void;
}

const MAX_ATTEMPTS = 6;

const GameBoard: React.FC<GameBoardProps> = ({ gameState, onGuess }) => {
  const [guess, setGuess] = useState('');
  const [showError, setShowError] = useState(false);
  
  const progressPercentage = (gameState.attempts / MAX_ATTEMPTS) * 100;
  const remainingAttempts = MAX_ATTEMPTS - gameState.attempts;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (guess.trim()) {
      onGuess(guess.trim());
      setGuess('');
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const getBlurAmount = () => {
    return Math.max(0, 20 - (gameState.attempts * 4));
  };

  return (
    <Card className="w-full max-w-3xl mx-auto bg-zinc-900/90 border-indigo-500/20 backdrop-blur-sm">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-medium text-zinc-400">
              Attempt {gameState.attempts}/{MAX_ATTEMPTS}
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="w-full max-w-[200px] h-2"
          />
          <span className="text-sm font-medium text-zinc-400">
            {remainingAttempts} left
          </span>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {gameState.movie.genres.map((genre, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20"
            >
              <Tag className="w-3 h-3 mr-1" />
              {genre}
            </Badge>
          ))}
        </div>

        <Separator className="bg-indigo-500/20" />
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <div 
            className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900/50"
            style={{ zIndex: 2 }}
          />
          <Image
            src={gameState.movie.imageUrl}
            alt="Movie Still"
            fill
            className="object-cover transition-all duration-500"
            style={{ 
              filter: `blur(${getBlurAmount()}px)`,
              transform: 'scale(1.1)'
            }}
            priority
          />
        </div>

        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Movie Clues
          </h3>
          
          {gameState.previousClues.map((clue, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              className="text-sm text-zinc-500 pl-4 border-l border-zinc-800"
            >
              {clue}
            </motion.div>
          ))}
          
          {gameState.currentClue && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-indigo-200 font-medium pl-4 border-l-2 border-indigo-500"
            >
              {gameState.currentClue}
            </motion.div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Enter movie title..."
              className="flex-1 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              disabled={gameState.isComplete || gameState.attempts >= MAX_ATTEMPTS}
            />
            <Button 
              type="submit"
              disabled={gameState.isComplete || gameState.attempts >= MAX_ATTEMPTS}
              className={cn(
                "bg-indigo-600 hover:bg-indigo-700 text-white",
                (gameState.isComplete || gameState.attempts >= MAX_ATTEMPTS) && "opacity-50"
              )}
            >
              Guess
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {gameState.guesses.map((guess, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-zinc-800/30 p-3 rounded-md border border-zinc-800/50"
              >
                <span className="text-zinc-300 font-medium">
                  {guess}
                </span>
              </motion.div>
            ))}
          </div>
        </form>

        <AnimatePresence>
          {gameState.isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert className="bg-green-500/20 border-green-500/50 text-green-200">
                <Star className="w-4 h-4" />
                <AlertDescription className="ml-2">
                  Congratulations! You&apos;ve correctly guessed today&apos;s movie: &quot;{gameState.movie.title}&quot;!
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {!gameState.isComplete && gameState.attempts >= MAX_ATTEMPTS && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert className="bg-red-500/20 border-red-500/50 text-red-200">
                <AlertDescription>
                  Game Over • The movie was &quot;{gameState.movie.title}&quot;
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {showError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert className="bg-red-500/20 border-red-500/50 text-red-200">
                <AlertDescription>
                  Please enter a valid guess
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default GameBoard;