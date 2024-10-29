import { createClient } from '@supabase/supabase-js';
import { fetchCuratedMovies, getImageUrl } from '../lib/tmdb';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function initializeDatabase() {
  console.log('Starting database initialization...');

  try {
    // Fetch movies from TMDB
    const movies = await fetchCuratedMovies();
    console.log(`Fetched ${movies.length} movies from TMDB`);

    // Insert movies into Supabase
    for (const movie of movies) {
      const { data, error } = await supabase
        .from('movies')
        .upsert({
          tmdb_id: movie.id,
          title: movie.title,
          image_url: getImageUrl(movie.backdrop_path || movie.poster_path),
          genres: JSON.stringify(movie.genres)
        }, {
          onConflict: 'tmdb_id'
        });

      if (error) {
        console.error(`Error inserting movie ${movie.title}:`, error);
      } else {
        console.log(`Processed: ${movie.title}`);
      }
    }

    console.log('Database initialization complete');
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
}

initializeDatabase()
  .catch(console.error)
  .finally(() => process.exit(0));