import type { WordlePuzzle, CrosswordPuzzle, AdminActivity } from '@/types';
import { todayStr, addDays, uid } from '@/utils/helpers';
import { generateCrossword } from '@/utils/crosswordGenerator';

// =====================
// Wordle puzzles
// =====================
const WORDS = ['CRANE', 'SLATE', 'ADIEU', 'AUDIO', 'TRACE', 'ROAST', 'RIVER', 'MOUNT', 'STONE', 'SHARP'];

export function seedWordlePuzzles(): WordlePuzzle[] {
  const puzzles: WordlePuzzle[] = [];
  const today = todayStr();
  // Past 3 days
  for (let i = 3; i >= 1; i--) {
    puzzles.push({
      date: addDays(today, -i),
      word: WORDS[(10 - i) % WORDS.length],
      status: 'completed',
    });
  }
  // Today
  puzzles.push({ date: today, word: WORDS[0], status: 'active' });
  // Future 5 days
  for (let i = 1; i <= 5; i++) {
    puzzles.push({
      date: addDays(today, i),
      word: WORDS[i % WORDS.length],
      status: 'scheduled',
    });
  }
  return puzzles;
}

// =====================
// Crossword puzzles
// =====================
interface SeedCrossword {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  size: number;
  words: { word: string; clue: string }[];
  publishDate: string | null;
  published: boolean;
}

function makePuzzle(seed: SeedCrossword, size: number): CrosswordPuzzle {
  const { grid, clues, unplaced } = generateCrossword(seed.words, size);
  return {
    id: uid(),
    title: seed.title,
    description: seed.description,
    difficulty: seed.difficulty,
    size,
    status: seed.published ? 'published' : 'draft',
    publishDate: seed.published ? seed.publishDate : null,
    createdAt: seed.publishDate ?? todayStr(),
    updatedAt: seed.publishDate ?? todayStr(),
    grid,
    clues,
  };
}

export function seedCrosswordPuzzles(): CrosswordPuzzle[] {
  const today = todayStr();
  const seeds: SeedCrossword[] = [
    {
      title: 'The Midnight Run',
      description: 'A nighttime journey through winding streets and shadowed paths.',
      difficulty: 'easy',
      size: 10,
      publishDate: addDays(today, -5),
      published: true,
      words: [
        { word: 'MIDNIGHT', clue: 'The witching hour' },
        { word: 'RUN', clue: 'A quick sprint' },
        { word: 'DARK', clue: 'Absence of light' },
        { word: 'STAR', clue: 'Twinkles in the night sky' },
        { word: 'MOON', clue: 'Earth\'s natural satellite' },
        { word: 'NIGHT', clue: 'When shadows fall' },
        { word: 'GHOST', clue: 'Spectral apparition' },
      ],
    },
    {
      title: 'City Streets',
      description: 'Navigate the urban grid of alleys, avenues, and landmarks.',
      difficulty: 'medium',
      size: 12,
      publishDate: addDays(today, -3),
      published: true,
      words: [
        { word: 'CITY', clue: 'Urban settlement' },
        { word: 'STREET', clue: 'A public road' },
        { word: 'AVENUE', clue: 'A broad road lined with trees' },
        { word: 'BLOCK', clue: 'A city section' },
        { word: 'TRAFFIC', clue: 'Vehicles on the road' },
        { word: 'WALK', clue: 'To travel on foot' },
        { word: 'PARK', clue: 'Green space in a city' },
        { word: 'TOWER', clue: 'A tall structure' },
      ],
    },
    {
      title: 'Into the Unknown',
      description: 'Venture beyond familiar borders into uncharted territory.',
      difficulty: 'hard',
      size: 12,
      publishDate: addDays(today, -1),
      published: true,
      words: [
        { word: 'UNKNOWN', clue: 'Not known or familiar' },
        { word: 'JOURNEY', clue: 'An act of traveling' },
        { word: 'EXPLORE', clue: 'To discover new places' },
        { word: 'MAP', clue: 'A visual guide' },
        { word: 'PATH', clue: 'A route to follow' },
        { word: 'QUEST', clue: 'A long search' },
        { word: 'WILD', clue: 'Untamed nature' },
        { word: 'BRAVE', clue: 'Showing courage' },
      ],
    },
    {
      title: 'Back in Black',
      description: 'A return to form with classic dark tones.',
      difficulty: 'easy',
      size: 10,
      publishDate: addDays(today, -10),
      published: true,
      words: [
        { word: 'BLACK', clue: 'Darkest color' },
        { word: 'BACK', clue: 'Return' },
        { word: 'NIGHT', clue: 'After sunset' },
        { word: 'SHADE', clue: 'A darker variant' },
        { word: 'COAL', clue: 'Black fuel' },
        { word: 'RAVEN', clue: 'Black bird' },
        { word: 'INK', clue: 'Writing fluid' },
      ],
    },
    {
      title: 'The Long Road',
      description: 'An extended journey with many miles ahead.',
      difficulty: 'medium',
      size: 12,
      publishDate: null,
      published: false,
      words: [
        { word: 'ROAD', clue: 'A path for vehicles' },
        { word: 'LONG', clue: 'Extended in distance' },
        { word: 'TRAVEL', clue: 'To go from place to place' },
        { word: 'MILES', clue: 'Distance measurement' },
        { word: 'HORIZON', clue: 'Where sky meets earth' },
        { word: 'DRIVE', clue: 'To operate a vehicle' },
        { word: 'REST', clue: 'A break from travel' },
      ],
    },
    {
      title: 'Final Chapter',
      description: 'The concluding entry — a fitting end to the collection.',
      difficulty: 'hard',
      size: 12,
      publishDate: addDays(today, -7),
      published: true,
      words: [
        { word: 'FINAL', clue: 'Last in sequence' },
        { word: 'CHAPTER', clue: 'A main section of a book' },
        { word: 'END', clue: 'The conclusion' },
        { word: 'STORY', clue: 'A narrative' },
        { word: 'CLOSURE', clue: 'A sense of resolution' },
        { word: 'EPILOGUE', clue: 'A concluding section' },
        { word: 'TALE', clue: 'A narrative' },
        { word: 'CLOSE', clue: 'To shut or conclude' },
      ],
    },
  ];

  return seeds.map((s) => makePuzzle(s, s.size));
}

// =====================
// Admin activity
// =====================
export function seedAdminActivity(): AdminActivity[] {
  const today = todayStr();
  return [
    { id: uid(), action: 'Published crossword', detail: 'Into the Unknown', timestamp: addDays(today, -1) + 'T10:30:00Z' },
    { id: uid(), action: 'Set daily word', detail: 'CRANE for ' + today, timestamp: today + 'T08:00:00Z' },
    { id: uid(), action: 'Created crossword draft', detail: 'The Long Road', timestamp: addDays(today, -2) + 'T14:15:00Z' },
    { id: uid(), action: 'Published crossword', detail: 'City Streets', timestamp: addDays(today, -3) + 'T11:00:00Z' },
  ];
}
