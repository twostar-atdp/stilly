// app/components/GameStats.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, Flame, BarChart2 } from 'lucide-react';
import { UserGameStats } from '@/lib/game';
import { motion } from "framer-motion";

interface GameStatsProps {
  stats: UserGameStats;
  show: boolean;
  onClose?: () => void;
}

const GameStats: React.FC<GameStatsProps> = ({ stats, show, onClose }) => {
  if (!show) return null;

  const winPercentage = stats.totalGames > 0 
    ? Math.round((stats.gamesWon / stats.totalGames) * 100) 
    : 0;

  const maxGuesses = Math.max(...Object.values(stats.guessDistribution));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-md bg-zinc-900/95 border-indigo-500/20 backdrop-blur-sm"
        onClick={e => e.stopPropagation()}
      >
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Your Statistics
            </CardTitle>
            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              ✕
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Stat
              value={stats.totalGames}
              label="Played"
              icon={<BarChart2 className="w-4 h-4 text-blue-400" />}
            />
            <Stat
              value={`${winPercentage}%`}
              label="Win Rate"
              icon={<Trophy className="w-4 h-4 text-yellow-400" />}
            />
            <Stat
              value={stats.currentStreak}
              label="Streak"
              icon={<Flame className="w-4 h-4 text-orange-400" />}
            />
            <Stat
              value={stats.maxStreak}
              label="Max Streak"
              icon={<Award className="w-4 h-4 text-purple-400" />}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              Guess Distribution
            </h3>
            <div className="space-y-2">
              {Object.entries(stats.guessDistribution).map(([guess, count]) => (
                <div key={guess} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 w-4">{guess}</span>
                  <div className="flex-1">
                    <div
                      className={`rounded-sm h-5 flex items-center px-2 transition-all ${
                        count > 0 
                          ? 'bg-indigo-500/20 hover:bg-indigo-500/30' 
                          : 'bg-zinc-800/50'
                      }`}
                      style={{
                        width: maxGuesses > 0 
                          ? `${(count / maxGuesses) * 100}%` 
                          : '0%',
                        minWidth: count > 0 ? '2rem' : '0'
                      }}
                    >
                      <span className="text-xs text-zinc-100">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {stats.totalGames > 0 && (
            <div className="pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-400 text-center">
                Next movie in{' '}
                <TimeUntilNextGame />
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const Stat: React.FC<{
  value: number | string;
  label: string;
  icon: React.ReactNode;
}> = ({ value, label, icon }) => (
  <div className="flex flex-col items-center space-y-1">
    {icon}
    <span className="text-2xl font-bold text-zinc-100">
      {value}
    </span>
    <span className="text-xs text-zinc-400">
      {label}
    </span>
  </div>
);

const TimeUntilNextGame: React.FC = () => {
  const [timeLeft, setTimeLeft] = React.useState<string>('');

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}m`;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return <span className="font-medium text-indigo-400">{timeLeft}</span>;
};

export default GameStats;