// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export type Database = {
  public: {
    Tables: {
      movies: {
        Row: {
          id: number;
          tmdb_id: number;
          title: string;
          image_url: string;
          genres: string;
          created_at: string;
        };
        Insert: {
          tmdb_id: number;
          title: string;
          image_url: string;
          genres: string;
        };
      };
      games: {
        Row: {
          id: number;
          date: string;
          movie_id: number;
          attempts: number;
          is_complete: boolean;
          created_at: string;
        };
        Insert: {
          date: string;
          movie_id: number;
          attempts: number;
          is_complete: boolean;
        };
      };
      game_guesses: {
        Row: {
          id: number;
          game_id: number;
          guess: string;
          created_at: string;
        };
        Insert: {
          game_id: number;
          guess: string;
        };
      };
      game_clues: {
        Row: {
          id: number;
          game_id: number;
          content: string;
          created_at: string;
        };
        Insert: {
          game_id: number;
          content: string;
        };
      };
    };
  };
};

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});