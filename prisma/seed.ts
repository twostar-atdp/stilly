import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// Move TMDB functions directly into seed file
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  throw new Error('TMDB_API_KEY is not defined in environment variables.');
}

interface TMDBMovie {
  id: number;
  title: string;
  backdrop_path: string | null;
  poster_path: string | null;
  genres: { id: number; name: string; }[];
}

// Curated list IDs from TMDB
const CURATED_LISTS = [
  { id: '634', name: 'Best Picture Winners - The Academy Awards' },
  { id: '10', name: 'AFI Top 100' },
  { id: '3682', name: 'Empire Magazine 100 Greatest Films' },
];

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
        const details = await axios.get(`${TMDB_BASE_URL}/movie/${movie.id}`, {
          params: {
            api_key: TMDB_API_KEY,
            language: 'en-US',
            append_to_response: 'credits'
          },
        });

        return {
          id: movie.id,
          title: movie.title,
          backdrop_path: movie.backdrop_path,
          poster_path: movie.poster_path,
          genres: details.data.genres,
        };
      })
    );

    return movies;
  } catch (error) {
    console.error(`Error fetching list ${listId}:`, error);
    return [];
  }
}

function getImageUrl(path: string | null, size: string = 'w500'): string {
  if (!path) return '/placeholder.png';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

async function main() {
  console.log('Starting seed process...');

  try {
    // Fetch movies from all curated lists
    const allMovies: TMDBMovie[] = [];
    for (const list of CURATED_LISTS) {
      console.log(`Fetching movies from ${list.name}...`);
      const movies = await fetchMovieFromList(list.id);
      allMovies.push(...movies);
    }

    // Deduplicate movies
    const uniqueMovies = Array.from(
      new Map(allMovies.map(movie => [movie.id, movie])).values()
    );

    console.log(`Found ${uniqueMovies.length} unique movies`);

    // Add movies to database
    for (const movie of uniqueMovies) {
      const imageUrl = getImageUrl(movie.backdrop_path || movie.poster_path);
      const genres = movie.genres.map(g => g.name);

      try {
        await prisma.movie.upsert({
          where: { tmdbId: movie.id },
          update: {},
          create: {
            tmdbId: movie.id,
            title: movie.title,
            imageUrl,
            genres: JSON.stringify(genres),
          },
        });
        console.log(`Processed: ${movie.title}`);
      } catch (error) {
        console.error(`Error processing movie ${movie.title}:`, error);
      }
    }

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });