import axios from 'axios';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  throw new Error('TMDB_API_KEY is not defined in environment variables.');
}

export interface TMDBMovie {
  id: number;
  title: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
  popularity: number;
  genres: string[];
  tagline?: string;
  overview: string;
  director?: string;
  runtime?: number;
}

// Curated list IDs from TMDB
const CURATED_LISTS = [
  { id: '634', name: 'Best Picture Winners - The Academy Awards' },
  { id: '10', name: 'AFI Top 100' },
  { id: '3682', name: 'Empire Magazine 100 Greatest Films' },
  { id: '3945', name: 'Sight & Sound Top 100' },
  { id: '3721', name: 'IMDB Top 250' },
] as const;

async function fetchMovieFromList(listId: string): Promise<TMDBMovie[]> {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/list/${listId}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
      },
    });

    const movies = await Promise.all(
      response.data.items.map(async (movie: any) => {
        // Fetch additional movie details including credits
        const details = await axios.get(`${TMDB_BASE_URL}/movie/${movie.id}`, {
          params: {
            api_key: TMDB_API_KEY,
            language: 'en-US',
            append_to_response: 'credits'
          },
        });

        const director = details.data.credits?.crew.find(
          (person: any) => person.job === 'Director'
        )?.name;

        return {
          id: movie.id,
          title: movie.title,
          backdrop_path: movie.backdrop_path,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
          release_date: movie.release_date,
          popularity: movie.popularity,
          genres: details.data.genres.map((g: any) => g.name),
          tagline: details.data.tagline,
          overview: details.data.overview,
          director,
          runtime: details.data.runtime,
        };
      })
    );

    return movies;
  } catch (error) {
    console.error(`Error fetching list ${listId}:`, error);
    return [];
  }
}

export async function fetchCuratedMovies(): Promise<TMDBMovie[]> {
  try {
    const allMovies = await Promise.all(
      CURATED_LISTS.map(list => fetchMovieFromList(list.id))
    );

    // Flatten and deduplicate movies based on ID
    const moviesMap = new Map<number, TMDBMovie>();
    allMovies.flat().forEach(movie => {
      if (!moviesMap.has(movie.id)) {
        moviesMap.set(movie.id, movie);
      }
    });

    // Convert back to array and filter for quality
    return Array.from(moviesMap.values()).filter(movie => 
      (movie.backdrop_path || movie.poster_path) &&
      movie.genres.length > 0
    );
  } catch (error) {
    console.error('Error fetching curated movies:', error);
    return [];
  }
}

export function getImageUrl(path: string | null, size: string = 'w500'): string {
  if (!path) return '/placeholder.png';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function generateClue(movie: TMDBMovie, attemptNumber: number): string {
  const clues = [
    `This film was released in ${movie.release_date.split('-')[0]}`,
    `Directed by ${movie.director}`,
    `Runtime: ${movie.runtime} minutes`,
    `Tagline: "${movie.tagline}"`,
    `From the plot: "${movie.overview.split('.')[0]}."`,
    `This movie's average rating is ${movie.vote_average}/10`,
  ];
  
  return clues[attemptNumber - 1] || "No more clues available!";
}