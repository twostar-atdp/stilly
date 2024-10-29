import { createClient } from './server';
import { cookies } from 'next/headers';
import { Game, Movie } from './types';

export async function getGameWithRelations(gameId: number): Promise<Game | null> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      movie:movies(*),
      guesses:game_guesses(id, guess, created_at),
      clues:game_clues(id, content, created_at)
    `)
    .eq('id', gameId)
    .single();

  if (error) {
    console.error('Error fetching game:', error);
    return null;
  }

  return data;
}

export async function updateGameState(
  gameId: number,
  updates: Partial<Game>
): Promise<Game | null> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from('games')
    .update(updates)
    .eq('id', gameId)
    .select(`
      *,
      movie:movies(*),
      guesses:game_guesses(id, guess, created_at),
      clues:game_clues(id, content, created_at)
    `)
    .single();

  if (error) {
    console.error('Error updating game:', error);
    return null;
  }

  return data;
}