// lib/game.ts

import { supabase } from './supabase';
import { fetchCuratedMovies, getImageUrl, type TMDBMovie } from './tmdb';
import { cookies } from 'next/headers';

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
  stats: UserGameStats;
}

interface UserGameStats {
  totalGames: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: Record<number, number>;
}

const DEFAULT_STATS: UserGameStats = {
  totalGames: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0
  }
};

async function getUserId(sessionId: string): Promise<number> {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  // Try to get existing user
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id, stats')
    .eq('session_id', sessionId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    throw new Error(`Error fetching user: ${fetchError.message}`);
  }

  if (existingUser) {
    return existingUser.id;
  }

  // Create new user if doesn't exist
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      session_id: sessionId,
      stats: DEFAULT_STATS
    })
    .select('id')
    .single();

  if (createError || !newUser) {
    throw new Error(`Failed to create user: ${createError?.message}`);
  }

  return newUser.id;
}

async function getUserStats(userId: number): Promise<UserGameStats> {
  const { data, error } = await supabase
    .from('users')
    .select('stats')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch user stats: ${error.message}`);
  }

  return data.stats as UserGameStats;
}

async function updateUserStats(
  userId: number, 
  gameOutcome: { won: boolean; attempts: number }
): Promise<UserGameStats> {
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('stats')
    .eq('id', userId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch user for stats update: ${fetchError.message}`);
  }

  const currentStats = user.stats as UserGameStats;
  const newStats = {
    ...currentStats,
    totalGames: currentStats.totalGames + 1,
    gamesWon: currentStats.gamesWon + (gameOutcome.won ? 1 : 0),
    currentStreak: gameOutcome.won ? currentStats.currentStreak + 1 : 0,
    maxStreak: gameOutcome.won 
      ? Math.max(currentStats.maxStreak, currentStats.currentStreak + 1)
      : currentStats.maxStreak,
    guessDistribution: {
      ...currentStats.guessDistribution,
      [gameOutcome.attempts]: gameOutcome.won 
        ? (currentStats.guessDistribution[gameOutcome.attempts] || 0) + 1
        : currentStats.guessDistribution[gameOutcome.attempts] || 0
    }
  };

  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({ stats: newStats })
    .eq('id', userId)
    .select('stats')
    .single();

  if (updateError) {
    throw new Error(`Failed to update user stats: ${updateError.message}`);
  }

  return updatedUser.stats as UserGameStats;
}

export async function initializeTodayGame(): Promise<GameState | null> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // First check if a game already exists for today
    const { data: existingGame } = await supabase
      .from('games')
      .select('*')
      .eq('date', today.toISOString().split('T')[0])
      .single();

    if (existingGame) {
      return getTodayGame(existingGame.id.toString());
    }

    // Select a movie for today
    const selectedMovie = await selectCuratedMovie();

    // Create or get movie record
    let movieRecord;
    const { data: newMovie, error: movieError } = await supabase
      .from('movies')
      .insert({
        tmdb_id: selectedMovie.id,
        title: selectedMovie.title,
        image_url: selectedMovie.imageUrl,
        genres: JSON.stringify(selectedMovie.genres)
      })
      .select()
      .single();

    if (movieError) {
      if (movieError.code === '23505') { // Unique violation
        const { data: existingMovie } = await supabase
          .from('movies')
          .select()
          .eq('tmdb_id', selectedMovie.id)
          .single();
        
        if (existingMovie) {
          movieRecord = existingMovie;
        } else {
          throw new Error('Failed to fetch existing movie');
        }
      } else {
        throw new Error(`Failed to create movie record: ${movieError.message}`);
      }
    } else {
      movieRecord = newMovie;
    }

    // Create game record
    const { data: gameRecord, error: gameError } = await supabase
      .from('games')
      .insert({
        date: today.toISOString().split('T')[0],
        movie_id: movieRecord.id
      })
      .select(`
        *,
        movie:movies(*)
      `)
      .single();

    if (gameError) {
      throw new Error(`Failed to create game record: ${gameError.message}`);
    }

    return {
      id: gameRecord.id,
      date: new Date(gameRecord.date),
      movie: {
        id: gameRecord.movie.tmdb_id,
        title: gameRecord.movie.title,
        imageUrl: gameRecord.movie.image_url,
        genres: JSON.parse(gameRecord.movie.genres),
      },
      guesses: [],
      attempts: 0,
      isComplete: false,
      currentClue: '',
      previousClues: [],
      stats: DEFAULT_STATS
    };
  } catch (error) {
    console.error('Error initializing today\'s game:', error);
    throw error;
  }
}

interface RecentGameMovie {
  movie: {
    tmdb_id: number;
  }
}

async function selectCuratedMovie(): Promise<{ 
  id: number; 
  title: string; 
  imageUrl: string; 
  genres: string[] 
}> {
  const movies = await fetchCuratedMovies();
  if (!movies.length) {
    throw new Error('No movies available');
  }

  // Get recently used movies with proper typing
  const { data: recentGames, error: recentGamesError } = await supabase
    .from('games')
    .select<string, RecentGameMovie>('movie:movies!inner(tmdb_id)')
    .order('date', { ascending: false })
    .limit(100);

  if (recentGamesError) {
    console.error('Error fetching recent games:', recentGamesError);
    throw new Error(`Failed to fetch recent games: ${recentGamesError.message}`);
  }

  // Extract tmdb_ids from the nested movie objects
  const recentMovieIds = new Set(
    recentGames?.map(game => game.movie.tmdb_id) || []
  );

  // Filter out recently used movies
  const availableMovies = movies.filter(
    movie => !recentMovieIds.has(movie.id)
  );

  // If no unused movies, use all movies
  const moviePool = availableMovies.length > 0 ? availableMovies : movies;

  // Use date as seed for consistent random selection
  const today = new Date();
  const seed = today.getFullYear() * 10000 + 
               (today.getMonth() + 1) * 100 + 
               today.getDate();
  const selectedMovie = moviePool[seed % moviePool.length];

  return {
    id: selectedMovie.id,
    title: selectedMovie.title,
    imageUrl: getImageUrl(
      selectedMovie.backdrop_path || selectedMovie.poster_path
    ),
    genres: selectedMovie.genres
  };
}

export async function getTodayGame(sessionId: string): Promise<GameState | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get or create user
  const userId = await getUserId(sessionId);

  // Get today's game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select(`
      *,
      movie:movies(*)
    `)
    .eq('date', today.toISOString().split('T')[0])
    .single();

  if (gameError && gameError.code !== 'PGRST116') {
    throw new Error(`Error fetching game: ${gameError.message}`);
  }

  if (!game) {
    const newGame = await initializeTodayGame();
    return getOrCreateUserSession(userId, newGame!.id);
  }

  return getOrCreateUserSession(userId, game.id);
}

async function getOrCreateUserSession(userId: number, gameId: number): Promise<GameState> {
  // Get existing session
  const { data: existingSession, error: sessionError } = await supabase
    .from('user_game_sessions')
    .select(`
      *,
      game:games(
        *,
        movie:movies(*)
      ),
      guesses:user_game_guesses(guess, created_at),
      clues:user_game_clues(content, created_at)
    `)
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .single();

  if (sessionError && sessionError.code !== 'PGRST116') {
    throw new Error(`Error fetching user session: ${sessionError.message}`);
  }

  if (existingSession) {
    const userStats = await getUserStats(userId);
    return mapGameToState(existingSession.game, existingSession, userStats);
  }

  // Create new session
  const { data: newSession, error: createError } = await supabase
    .from('user_game_sessions')
    .insert({
      user_id: userId,
      game_id: gameId,
      attempts: 0,
      is_complete: false
    })
    .select(`
      *,
      game:games(
        *,
        movie:movies(*)
      ),
      guesses:user_game_guesses(guess, created_at),
      clues:user_game_clues(content, created_at)
    `)
    .single();

  if (createError || !newSession) {
    throw new Error(`Failed to create user session: ${createError?.message}`);
  }

  const userStats = await getUserStats(userId);
  return mapGameToState(newSession.game, newSession, userStats);
}

export async function makeGuess(sessionId: string, guess: string): Promise<GameState> {
  try {
    const userId = await getUserId(sessionId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // First get today's game
    const { data: todayGame, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('date', today.toISOString().split('T')[0])
      .single();

    if (gameError) {
      throw new Error('No active game found for today');
    }

    // Then get the user's session for today's game
    const { data: session, error: sessionError } = await supabase
      .from('user_game_sessions')
      .select(`
        *,
        game:games!inner(
          *,
          movie:movies(*)
        ),
        guesses:user_game_guesses(
          guess,
          created_at
        ),
        clues:user_game_clues(
          content,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('game_id', todayGame.id)
      .single();

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      throw new Error('Active game session not found');
    }

    if (session.is_complete || session.attempts >= 6) {
      throw new Error('Game is already complete');
    }

    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedTitle = session.game.movie.title.toLowerCase();
    const isCorrect = normalizedGuess === normalizedTitle;
    const newAttemptNumber = session.attempts + 1;

    // Add guess
    const { error: guessError } = await supabase
      .from('user_game_guesses')
      .insert({
        user_game_session_id: session.id,
        guess: guess.trim()
      });

    if (guessError) {
      throw new Error(`Failed to save guess: ${guessError.message}`);
    }

    // Generate and add new clue
    const movies = await fetchCuratedMovies();
    const movieData = movies.find(m => m.id === session.game.movie.tmdb_id);
    const newClue = movieData ? generateClue(movieData, newAttemptNumber) : '';

    if (newClue) {
      const { error: clueError } = await supabase
        .from('user_game_clues')
        .insert({
          user_game_session_id: session.id,
          content: newClue
        });

      if (clueError) {
        throw new Error(`Failed to save clue: ${clueError.message}`);
      }
    }

    // Update session state
    const { data: updatedSession, error: updateError } = await supabase
      .from('user_game_sessions')
      .update({
        attempts: newAttemptNumber,
        is_complete: isCorrect
      })
      .eq('id', session.id)
      .select(`
        *,
        game:games(
          *,
          movie:movies(*)
        ),
        guesses:user_game_guesses(guess, created_at),
        clues:user_game_clues(content, created_at)
      `)
      .single();

    if (updateError || !updatedSession) {
      throw new Error(`Failed to update session: ${updateError?.message}`);
    }

    // Update user stats if game is complete
    const gameComplete = isCorrect || newAttemptNumber >= 6;
    if (gameComplete) {
      const userStats = await updateUserStats(userId, {
        won: isCorrect,
        attempts: newAttemptNumber
      });
      return mapGameToState(updatedSession.game, updatedSession, userStats);
    }

    const userStats = await getUserStats(userId);
    return mapGameToState(updatedSession.game, updatedSession, userStats);
  } catch (error) {
    console.error('Error in makeGuess:', error);
    throw error;
  }
}
function generateClue(movie: TMDBMovie, attemptNumber: number): string {
  const clues = [
    `Released in ${movie.release_date?.split('-')[0]}`,
    movie.director ? `Directed by ${movie.director}` : `A film from ${movie.release_date?.split('-')[0]}`,
    movie.runtime ? `Runtime: ${movie.runtime} minutes` : `Features ${movie.genres.join(', ')}`,
    movie.tagline ? `Tagline: "${movie.tagline}"` : movie.overview ? `Plot hint: "${movie.overview.split('.')[0]}."` : `Stars rate it ${movie.vote_average}/10`,
    movie.overview ? `Synopsis preview: "${movie.overview.split('.').slice(0, 2).join('.')}."` : `Popular in ${movie.genres[0]}`,
    `Final hint: This ${movie.genres[0].toLowerCase()} film has a ${movie.vote_average}/10 rating`
  ];
  
  return clues[Math.min(attemptNumber - 1, clues.length - 1)];
}

function mapGameToState(game: any, session: any, stats: UserGameStats): GameState {
  if (!game || !session) {
    throw new Error('Invalid game or session data provided to mapGameToState');
  }

  // Ensure proper sorting of guesses and clues by creation date
  const sortedGuesses = (session.guesses || [])
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((g: any) => g.guess);

  const sortedClues = (session.clues || [])
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((c: any) => c.content);

  try {
    // Parse genres with error handling
    const genres = (() => {
      try {
        return JSON.parse(game.movie.genres);
      } catch (e) {
        console.error('Error parsing genres:', e);
        return [];
      }
    })();

    return {
      id: game.id,
      date: new Date(game.date),
      movie: {
        id: game.movie.tmdb_id,
        title: game.movie.title,
        imageUrl: game.movie.image_url,
        genres: genres,
      },
      guesses: sortedGuesses,
      attempts: session.attempts,
      isComplete: session.is_complete,
      currentClue: sortedClues.length > 0 ? sortedClues[sortedClues.length - 1] : '',
      previousClues: sortedClues.slice(0, -1),
      stats
    };
  } catch (error) {
    console.error('Error mapping game state:', error);
    throw new Error('Failed to map game state: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// Helper function to validate game state
function validateGameState(state: GameState): boolean {
  if (!state) return false;

  // Basic structure validation
  const requiredProperties = [
    'id',
    'date',
    'movie',
    'guesses',
    'attempts',
    'isComplete',
    'currentClue',
    'previousClues',
    'stats'
  ];

  const hasAllProperties = requiredProperties.every(prop => prop in state);
  if (!hasAllProperties) return false;

  // Movie object validation
  const requiredMovieProperties = ['id', 'title', 'imageUrl', 'genres'];
  const hasAllMovieProperties = requiredMovieProperties.every(prop => prop in state.movie);
  if (!hasAllMovieProperties) return false;

  // Stats validation
  const requiredStatsProperties = [
    'totalGames',
    'gamesWon',
    'currentStreak',
    'maxStreak',
    'guessDistribution'
  ];
  const hasAllStatsProperties = requiredStatsProperties.every(prop => prop in state.stats);
  if (!hasAllStatsProperties) return false;

  // Type validations
  if (!(state.date instanceof Date)) return false;
  if (!Array.isArray(state.guesses)) return false;
  if (!Array.isArray(state.previousClues)) return false;
  if (!Array.isArray(state.movie.genres)) return false;
  if (typeof state.attempts !== 'number') return false;
  if (typeof state.isComplete !== 'boolean') return false;

  return true;
}

// Utility function to get today's date in ISO format for database queries
function getTodayDateString(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split('T')[0];
}

// Export additional types and utilities that might be needed by other parts of the application
export type { UserGameStats, TMDBMovie };
export { validateGameState, getTodayDateString, DEFAULT_STATS };
