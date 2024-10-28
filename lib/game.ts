import { prisma } from './prisma';
import { fetchCuratedMovies, getImageUrl, TMDBMovie, generateClue } from './tmdb';

export interface GameState {
  id: number;
  date: Date;
  movie: {
    id: number;
    title: string;
    imageUrl: string;
    genres: string[];
  };
  guesses: string[];
  attempts: number;
  isComplete: boolean;
  currentClue: string;
  previousClues: string[];
}

export async function initializeTodayGame(): Promise<GameState> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let game = await prisma.game.findUnique({
    where: { date: today },
    include: {
      movie: true,
      guesses: true,
      clues: true,
    },
  });

  if (!game) {
    const movie = await selectCuratedMovie();
    game = await prisma.game.create({
      data: {
        date: today,
        movie: {
          create: {
            tmdbId: movie.id,
            title: movie.title,
            imageUrl: movie.imageUrl,
            genres: JSON.stringify(movie.genres),
          },
        },
      },
      include: {
        movie: true,
        guesses: true,
        clues: true,
      },
    });
  }

  return mapGameToState(game);
}

export async function makeGuess(gameId: number, guess: string): Promise<GameState> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      movie: true,
      guesses: true,
      clues: true,
    },
  });

  if (!game) throw new Error('Game not found');

  const isCorrect = guess.trim().toLowerCase() === game.movie.title.toLowerCase();
  const newAttemptNumber = game.attempts + 1;

  // Generate new clue
  const movies = await fetchCuratedMovies();
  const movieData = movies.find((m: { id: number }) => m.id === game.movie.tmdbId);
  const newClue = movieData ? generateClue(movieData, newAttemptNumber) : '';

  const updatedGame = await prisma.game.update({
    where: { id: gameId },
    data: {
      attempts: newAttemptNumber,
      isComplete: isCorrect,
      guesses: {
        create: { guess }
      },
      clues: {
        create: { content: newClue }
      }
    },
    include: {
      movie: true,
      guesses: true,
      clues: true,
    },
  });

  return mapGameToState(updatedGame);
}

export async function getTodayGame(): Promise<GameState | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const game = await prisma.game.findUnique({
    where: { date: today },
    include: {
      movie: true,
      guesses: true,
      clues: true,
    },
  });

  if (!game) return null;

  return mapGameToState(game);
}

async function selectCuratedMovie(): Promise<{ id: number; title: string; imageUrl: string; genres: string[] }> {
  const movies = await fetchCuratedMovies();

  if (movies.length === 0) {
    throw new Error('No curated movies available.');
  }

  // Select a movie that hasn't been used recently
  const recentMovies = await prisma.movie.findMany({
    orderBy: { games: { _count: 'desc' } },
    take: 100,
    select: { tmdbId: true },
  });

  const recentMovieIds = new Set(recentMovies.map((m: { tmdbId: number }) => m.tmdbId));
  const availableMovies = movies.filter((movie: { id: number }) => !recentMovieIds.has(movie.id));
  const moviePool = availableMovies.length > 0 ? availableMovies : movies;
  
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const randomIndex = seed % moviePool.length;
  const selectedMovie = moviePool[randomIndex];

  return {
    id: selectedMovie.id,
    title: selectedMovie.title,
    imageUrl: getImageUrl(selectedMovie.backdrop_path || selectedMovie.poster_path),
    genres: selectedMovie.genres,
  };
}

function mapGameToState(game: any): GameState {
  return {
    id: game.id,
    date: game.date,
    movie: {
      id: game.movie.tmdbId,
      title: game.movie.title,
      imageUrl: game.movie.imageUrl,
      genres: JSON.parse(game.movie.genres),
    },
    guesses: game.guesses.map((guess: { guess: string }) => guess.guess),
    attempts: game.attempts,
    isComplete: game.isComplete,
    currentClue: game.clues[game.clues.length - 1]?.content || '',
    previousClues: game.clues.slice(0, -1).map((clue: { content: string }) => clue.content),
  };
}

export async function hasTodayGame(): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const game = await prisma.game.findUnique({
    where: { date: today },
  });

  return game !== null;
}

export async function getGameStats(): Promise<{
  gamesPlayed: number;
  averageAttempts: number;
  winRate: number;
}> {
  const games = await prisma.game.findMany({
    where: {
      isComplete: true,
    },
    select: {
      attempts: true,
    },
  });

  const totalGames = games.length;
  const totalAttempts = games.reduce((sum: number, game: { attempts: number }) => sum + game.attempts, 0);

  return {
    gamesPlayed: totalGames,
    averageAttempts: totalGames > 0 ? totalAttempts / totalGames : 0,
    winRate: totalGames > 0 ? (games.length / totalGames) * 100 : 0,
  };
}