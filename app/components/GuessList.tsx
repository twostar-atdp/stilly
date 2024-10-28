// app/components/GuessList.tsx

"use client";

import { FC } from 'react';

interface GuessListProps {
  guesses: string[];
}

export const GuessList: FC<GuessListProps> = ({ guesses }) => {
  return (
    <ul className="guess-list mt-4 grid grid-cols-6 gap-2 justify-center">
      {guesses.map((guess, index) => (
        <li
          key={index}
          className="guess-item border rounded-md p-2 text-center font-bold"
        >
          {guess.toUpperCase()}
        </li>
      ))}
    </ul>
  );
};
