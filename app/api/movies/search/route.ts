// app/api/movies/search/route.ts
import { NextResponse } from 'next/server';
import { fetchMovieSearch } from '@/lib/tmdb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const movies = await fetchMovieSearch(query);
    return NextResponse.json({ results: movies });
  } catch (error) {
    console.error('Error searching movies:', error);
    return NextResponse.json(
      { error: 'Failed to search movies' },
      { status: 500 }
    );
  }
}