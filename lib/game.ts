// lib/game.ts
import { supabase } from './supabase';
import { fetchCuratedMovies, getImageUrl } from './tmdb';

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

export async function getTodayGame(): Promise<GameState | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: game, error } = await supabase
    .from('games')
    .select(`
      *,
      movie:movies(*),
      guesses:game_guesses(guess),
      clues:game_clues(content)
    `)
    .eq('date', today.toISOString().split('T')[0])
    .single();

  if (error || !game) return null;

  return mapGameToState(game);
}

async function selectCuratedMovie(): Promise<{ id: number; title: string; imageUrl: string; genres: string[] }> {
  const movies = await fetchCuratedMovies();
  if (!movies.length) throw new Error('No movies available');

  const { data: recentMovies } = await supabase
    .from('games')
    .select('movie_id')
    .order('created_at', { ascending: false })
    .limit(100);

  const recentMovieIds = new Set(recentMovies?.map(m => m.movie_id) || []);
  const availableMovies = movies.filter(movie => !recentMovieIds.has(movie.id));
  const moviePool = availableMovies.length > 0 ? availableMovies : movies;

  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const randomIndex = seed % moviePool.length;
  const selectedMovie = moviePool[randomIndex];

  return {
    id: selectedMovie.id,
    title: selectedMovie.title,
    imageUrl: getImageUrl(selectedMovie.backdrop_path || selectedMovie.poster_path),
    genres: selectedMovie.genres
  };
}

export async function initializeTodayGame(): Promise<GameState> {
  const movie = await selectCuratedMovie();

  // Create or get movie
  const { data: existingMovie } = await supabase
    .from('movies')
    .select()
    .eq('tmdb_id', movie.id)
    .single();

  let movieId: number;

  if (!existingMovie) {
    const { data: newMovie, error: movieError } = await supabase
      .from('movies')
      .insert({
        tmdb_id: movie.id,
        title: movie.title,
        image_url: movie.imageUrl,
        genres: JSON.stringify(movie.genres)
      })
      .select()
      .single();

    if (movieError || !newMovie) throw new Error('Failed to create movie');
    movieId = newMovie.id;
  } else {
    movieId = existingMovie.id;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Create game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      date: today.toISOString().split('T')[0],
      movie_id: movieId,
      attempts: 0,
      is_complete: false
    })
    .select(`
      *,
      movie:movies(*),
      guesses:game_guesses(guess),
      clues:game_clues(content)
    `)
    .single();

  if (gameError || !game) throw new Error('Failed to create game');

  return mapGameToState(game);
}

export async function makeGuess(gameId: number, guess: string): Promise<GameState> {
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select(`
      *,
      movie:movies(*),
      guesses:game_guesses(guess),
      clues:game_clues(content)
    `)
    .eq('id', gameId)
    .single();

  if (gameError || !game) throw new Error('Game not found');

  const isCorrect = guess.trim().toLowerCase() === game.movie.title.toLowerCase();
  const newAttemptNumber = game.attempts + 1;

  // Add guess
  const { error: guessError } = await supabase
    .from('game_guesses')
    .insert({ game_id: gameId, guess: guess.trim() });

  if (guessError) throw new Error('Failed to save guess');

  // Generate and add new clue
  const movies = await fetchCuratedMovies();
  const movieData = movies.find(m => m.id === game.movie.tmdb_id);
  const newClue = movieData ? generateClue(movieData, newAttemptNumber) : '';

  if (newClue) {
    const { error: clueError } = await supabase
      .from('game_clues')
      .insert({ game_id: gameId, content: newClue });

    if (clueError) throw new Error('Failed to save clue');
  }

  // Update game state
  const { data: updatedGame, error: updateError } = await supabase
    .from('games')
    .update({
      attempts: newAttemptNumber,
      is_complete: isCorrect
    })
    .eq('id', gameId)
    .select(`
      *,
      movie:movies(*),
      guesses:game_guesses(guess),
      clues:game_clues(content)
    `)
    .single();

  if (updateError || !updatedGame) throw new Error('Failed to update game');

  return mapGameToState(updatedGame);
}

function generateClue(movie: any, attemptNumber: number): string {
  const clues = [
    `This film was released in ${movie.release_date?.split('-')[0]}`,
    `Directed by ${movie.director || 'Unknown'}`,
    `Runtime: ${movie.runtime || 'Unknown'} minutes`,
    movie.tagline ? `Tagline: "${movie.tagline}"` : `Genre: ${movie.genres?.[0] || 'Unknown'}`,
    movie.overview ? `From the plot: "${movie.overview.split('.')[0]}."` : "No plot details available",
    `This movie's average rating is ${movie.vote_average}/10`
  ];
  
  return clues[attemptNumber - 1] || "No more clues available!";
}

function mapGameToState(game: any): GameState {
  return {
    id: game.id,
    date: new Date(game.date),
    movie: {
      id: game.movie.tmdb_id,
      title: game.movie.title,
      imageUrl: game.movie.image_url,
      genres: JSON.parse(game.movie.genres),
    },
    guesses: game.guesses?.map((g: any) => g.guess) || [],
    attempts: game.attempts,
    isComplete: game.is_complete,
    currentClue: game.clues?.length > 0 ? game.clues[game.clues.length - 1].content : '',
    previousClues: (game.clues || []).slice(0, -1).map((c: any) => c.content),
  };
}