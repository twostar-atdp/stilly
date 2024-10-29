// app/components/MovieAutocomplete.tsx
"use client"

import { Fragment, useState, useEffect } from "react"
import { Combobox, Transition } from "@headlessui/react"
import { Film, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/lib/hooks/useDebounce"

interface MovieSuggestion {
  id: number
  title: string
  release_date: string
}

interface MovieAutocompleteProps {
  onSelect: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export function MovieAutocomplete({
  onSelect,
  disabled = false,
  placeholder = "Search for a movie...",
}: MovieAutocompleteProps) {
  const [selected, setSelected] = useState<MovieSuggestion | null>(null)
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const debouncedSearch = useDebounce(query, 300)

  // Fetch suggestions based on debounced query
  useEffect(() => {
    if (!debouncedSearch) {
      setSuggestions([])
      return
    }

    const fetchSuggestions = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/movies/search?q=${encodeURIComponent(debouncedSearch)}`
        )
        const data = await response.json()
        setSuggestions(data.results || [])
      } catch (error) {
        console.error("Error fetching suggestions:", error)
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
  }, [debouncedSearch])

  return (
    <Combobox
      value={selected}
      onChange={(movie) => {
        if (movie && movie.id !== 0) { // Assuming id:0 is 'No movies found'
          setSelected(movie)
          onSelect(movie.title)
        }
      }}
      as="div"
      className="relative"
    >
      <Combobox.Input
        className={cn(
          "w-full bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500",
          "focus:ring-1 focus:ring-indigo-500/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        displayValue={(movie: MovieSuggestion | null) => movie ? movie.title : ""}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        </div>
      )}
      <Transition
        as={Fragment}
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-zinc-800/90 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
          {suggestions.length === 0 && query !== "" ? (
            <Combobox.Option
              value={{ id: 0, title: "No movies found", release_date: "" }}
              disabled
            >
              {({ active }) => (
                <span
                  className={cn(
                    "block truncate px-4 py-2 text-zinc-500",
                    active && "bg-indigo-600 text-white"
                  )}
                >
                  No movies found.
                </span>
              )}
            </Combobox.Option>
          ) : (
            suggestions.map((movie) => (
              <Combobox.Option
                key={movie.id}
                value={movie}
                className={({ active }) =>
                  cn(
                    "relative cursor-default select-none py-2 pl-10 pr-4",
                    active ? "bg-indigo-600 text-white" : "text-zinc-200"
                  )
                }
              >
                {({ active, selected }) => (
                  <>
                    <span
                      className={cn(
                        "block truncate",
                        selected && "font-medium"
                      )}
                    >
                      {movie.title}
                    </span>
                    {movie.release_date && (
                      <span
                        className={cn(
                          "absolute inset-y-0 left-0 flex items-center pl-3 text-sm",
                          selected ? "text-white" : "text-zinc-400"
                        )}
                      >
                        {movie.release_date.split("-")[0]}
                      </span>
                    )}
                  </>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </Transition>
    </Combobox>
  )
}
