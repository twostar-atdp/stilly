// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          session_id: string
          stats: Json
          created_at: string
        }
        Insert: {
          session_id: string
          stats?: Json
          created_at?: string
        }
        Update: {
          session_id?: string
          stats?: Json
          created_at?: string
        }
      }
      movies: {
        Row: {
          id: number
          tmdb_id: number
          title: string
          image_url: string
          genres: string
          created_at: string
        }
        Insert: {
          tmdb_id: number
          title: string
          image_url: string
          genres: string
          created_at?: string
        }
        Update: {
          tmdb_id?: number
          title?: string
          image_url?: string
          genres?: string
          created_at?: string
        }
      }
      games: {
        Row: {
          id: number
          date: string
          movie_id: number
          created_at: string
        }
        Insert: {
          date: string
          movie_id: number
          created_at?: string
        }
        Update: {
          date?: string
          movie_id?: number
          created_at?: string
        }
      }
      user_game_sessions: {
        Row: {
          id: number
          user_id: number
          game_id: number
          attempts: number
          is_complete: boolean
          created_at: string
        }
        Insert: {
          user_id: number
          game_id: number
          attempts?: number
          is_complete?: boolean
          created_at?: string
        }
        Update: {
          user_id?: number
          game_id?: number
          attempts?: number
          is_complete?: boolean
          created_at?: string
        }
      }
      user_game_guesses: {
        Row: {
          id: number
          user_game_session_id: number
          guess: string
          created_at: string
        }
        Insert: {
          user_game_session_id: number
          guess: string
          created_at?: string
        }
        Update: {
          user_game_session_id?: number
          guess?: string
          created_at?: string
        }
      }
      user_game_clues: {
        Row: {
          id: number
          user_game_session_id: number
          content: string
          created_at: string
        }
        Insert: {
          user_game_session_id: number
          content: string
          created_at?: string
        }
        Update: {
          user_game_session_id?: number
          content?: string
          created_at?: string
        }
      }
    }
    Functions: {
      make_guess: {
        Args: {
          p_session_id: number
          p_guess: string
          p_is_correct: boolean
          p_attempt_number: number
          p_clue: string
        }
        Returns: Json
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});