export interface Movie {
    id: number;
    tmdb_id: number;
    title: string;
    image_url: string;
    genres: string;
    created_at: string;
  }
  
  export interface Game {
    id: number;
    date: string;
    movie_id: number;
    attempts: number;
    is_complete: boolean;
    created_at: string;
    movie?: Movie;
    guesses?: GameGuess[];
    clues?: GameClue[];
  }
  
  export interface GameGuess {
    id: number;
    game_id: number;
    guess: string;
    created_at: string;
  }
  
  export interface GameClue {
    id: number;
    game_id: number;
    content: string;
    created_at: string;
  }