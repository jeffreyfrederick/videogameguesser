import curatedGames from './curated-games.json';
import { GameWithOptions } from './types';

interface CuratedGame {
  id: number;
  name: string;
  year: number;
  release_date: string;
  rating: number;
  cover_url: string;
  screenshots: string[];
  summary: string;
  genres: string;
  developers: string;
  platforms: string;
}

// Type assertion for imported JSON
const games = curatedGames as CuratedGame[];

console.log(`🎮 Loaded ${games.length} curated games (1980-2024)`);

function getRandomScreenshot(game: CuratedGame): string {
  if (game.screenshots.length === 0) {
    throw new Error(`No screenshots available for ${game.name}`);
  }
  return game.screenshots[Math.floor(Math.random() * game.screenshots.length)];
}

function getGamesByYear(year: number): CuratedGame[] {
  return games.filter(game => game.year === year);
}

function getHighRatedGames(minRating: number = 80): CuratedGame[] {
  return games.filter(game => game.rating >= minRating);
}

// Parse genres from the string format like "['Platform', 'Adventure']"
function parseGenres(genresStr: string): string[] {
  if (!genresStr || genresStr === '') return [];
  
  try {
    // Clean up the string format and parse as JSON
    const cleaned = genresStr
      .replace(/'/g, '"') // Replace single quotes with double quotes for JSON
      .replace(/\[([^\]]+)\]/, '[$1]'); // Ensure proper array format
    
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    // Fallback: extract genres manually if JSON parsing fails
    const matches = genresStr.match(/'([^']+)'/g);
    return matches ? matches.map(match => match.replace(/'/g, '')) : [];
  }
}

// Normalize genre names for better matching
function normalizeGenre(genre: string): string {
  const normalizations: Record<string, string> = {
    'Role-playing (RPG)': 'RPG',
    'Turn-based strategy (TBS)': 'Strategy',
    'Real Time Strategy (RTS)': 'Strategy',
    'Hack and slash/Beat \'em up': 'Action',
    'Point-and-click': 'Adventure',
    'Visual Novel': 'Adventure',
    'Card & Board Game': 'Board',
    'Music/Rhythm': 'Music'
  };
  
  return normalizations[genre] || genre;
}

// Check if two games share at least one genre
function hasMatchingGenre(game1: CuratedGame, game2: CuratedGame): boolean {
  const genres1 = parseGenres(game1.genres).map(normalizeGenre);
  const genres2 = parseGenres(game2.genres).map(normalizeGenre);
  
  return genres1.some(g1 => genres2.includes(g1));
}

// Get games that match genre and are within year range
function getGenreAndYearMatchingGames(
  correctGame: CuratedGame, 
  yearRange: number = 3,
  excludeIds: number[] = []
): CuratedGame[] {
  const targetYear = correctGame.year;
  const correctGenres = parseGenres(correctGame.genres).map(normalizeGenre);
  
  return games.filter(game => {
    if (excludeIds.includes(game.id)) return false;
    
    // Check year proximity
    const yearDiff = Math.abs(game.year - targetYear);
    if (yearDiff > yearRange) return false;
    
    // Check genre match
    const gameGenres = parseGenres(game.genres).map(normalizeGenre);
    return correctGenres.some(genre => gameGenres.includes(genre));
  });
}

// Get games by broader categories if specific genre matching fails
function getBroadCategoryGames(correctGame: CuratedGame, yearRange: number = 5): CuratedGame[] {
  const targetYear = correctGame.year;
  const correctGenres = parseGenres(correctGame.genres).map(normalizeGenre);
  
  // Define broad category mappings
  const categoryMap: Record<string, string[]> = {
    'Action': ['Platform', 'Shooter', 'Fighting', 'Action', 'Arcade'],
    'RPG': ['RPG', 'Adventure', 'Strategy'],
    'Strategy': ['Strategy', 'Tactical', 'Simulator'],
    'Adventure': ['Adventure', 'Puzzle', 'Point-and-click'],
    'Sports': ['Sport', 'Racing', 'Simulator'],
    'Arcade': ['Arcade', 'Platform', 'Shooter', 'Action']
  };
  
  // Find which broad category this game belongs to
  let broadCategory: string | null = null;
  for (const [category, genres] of Object.entries(categoryMap)) {
    if (correctGenres.some(genre => genres.includes(genre))) {
      broadCategory = category;
      break;
    }
  }
  
  if (!broadCategory) return [];
  
  const allowedGenres = categoryMap[broadCategory];
  
  return games.filter(game => {
    const yearDiff = Math.abs(game.year - targetYear);
    if (yearDiff > yearRange) return false;
    
    const gameGenres = parseGenres(game.genres).map(normalizeGenre);
    return gameGenres.some(genre => allowedGenres.includes(genre));
  });
}

export async function getRandomGameWithScreenshot(): Promise<GameWithOptions> {
  try {
    // Generate a random year between 1980 and 2024
    const randomYear = Math.floor(Math.random() * (2024 - 1980 + 1)) + 1980;
    console.log(`🎯 Fetching games from year ${randomYear}`);
    
    // Get games from the random year
    let yearGames = getGamesByYear(randomYear);
    console.log(`📅 Found ${yearGames.length} games from ${randomYear}`);
    
    // If no games from that year, fall back to all high-rated games
    if (yearGames.length < 4) {
      console.log('🔄 Not enough games from that year, using high-rated games from all years');
      yearGames = getHighRatedGames(82); // Higher threshold for fallback
      
      if (yearGames.length < 4) {
        yearGames = getHighRatedGames(80); // Lower threshold as last resort
      }
    }
    
    if (yearGames.length === 0) {
      throw new Error('No games found with the specified criteria');
    }
    
    // Select a random game from the available options
    const correctGame = yearGames[Math.floor(Math.random() * yearGames.length)];
    console.log(`✅ Selected correct game: ${correctGame.name} (${correctGame.year}, rating: ${correctGame.rating})`);
    
    // Get a random screenshot from the game
    const screenshot = getRandomScreenshot(correctGame);
    
    // Create smart incorrect options using genre and year proximity
    let otherGames: CuratedGame[] = [];
    
    console.log(`🎯 Finding options for ${correctGame.name} (${parseGenres(correctGame.genres).join(', ')}, ${correctGame.year})`);
    
    // Phase 1: Try exact genre + year match (±3 years)
    const exactMatches = getGenreAndYearMatchingGames(correctGame, 3, [correctGame.id])
      .sort(() => Math.random() - 0.5);
    
    console.log(`🎮 Found ${exactMatches.length} exact genre+year matches`);
    otherGames = exactMatches.slice(0, 3);
    
    // Phase 2: If not enough, try broader genre categories (±5 years) 
    if (otherGames.length < 3) {
      console.log(`🔄 Expanding to broad categories (±5 years)`);
      const broadMatches = getBroadCategoryGames(correctGame, 5)
        .filter(g => g.id !== correctGame.id && !otherGames.find(og => og.id === g.id))
        .sort(() => Math.random() - 0.5);
      
      console.log(`🎮 Found ${broadMatches.length} broad category matches`);
      otherGames.push(...broadMatches.slice(0, 3 - otherGames.length));
    }
    
    // Phase 3: If still not enough, expand year range further (±10 years, any genre)
    if (otherGames.length < 3) {
      console.log(`🔄 Expanding to ±10 years, any genre`);
      const yearOnlyMatches = games
        .filter(g => {
          const yearDiff = Math.abs(g.year - correctGame.year);
          return yearDiff <= 10 && 
                 g.id !== correctGame.id && 
                 !otherGames.find(og => og.id === g.id);
        })
        .sort(() => Math.random() - 0.5);
      
      console.log(`🎮 Found ${yearOnlyMatches.length} year-only matches`);
      otherGames.push(...yearOnlyMatches.slice(0, 3 - otherGames.length));
    }
    
    // Phase 4: Final fallback - any high-rated games
    if (otherGames.length < 3) {
      console.log(`⚠️ Using fallback: any high-rated games`);
      const fallbackGames = getHighRatedGames(78)
        .filter(g => g.id !== correctGame.id && !otherGames.find(og => og.id === g.id))
        .sort(() => Math.random() - 0.5);
      
      otherGames.push(...fallbackGames.slice(0, 3 - otherGames.length));
    }
    
    // Create all options and shuffle them
    const allOptions = [correctGame.name, ...otherGames.map(g => g.name)]
      .sort(() => Math.random() - 0.5);
    
    // Log the final options with their details for debugging
    console.log(`🎲 Final options:`);
    console.log(`   ✅ ${correctGame.name} (${correctGame.year}) [${parseGenres(correctGame.genres).join(', ')}]`);
    otherGames.forEach((game, i) => {
      console.log(`   ${i + 1}. ${game.name} (${game.year}) [${parseGenres(game.genres).join(', ')}]`);
    });
    
    return {
      game: {
        id: correctGame.id,
        name: correctGame.name,
        background_image: correctGame.cover_url,
        slug: correctGame.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      },
      screenshot,
      options: allOptions,
      correctAnswer: correctGame.name
    };
    
  } catch (error) {
    console.error('❌ Error loading game from curated database:', error);
    throw new Error(`Failed to load game: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export for potential debugging/stats
export function getGameStats() {
  const yearCounts: Record<number, number> = {};
  games.forEach(game => {
    yearCounts[game.year] = (yearCounts[game.year] || 0) + 1;
  });
  
  return {
    totalGames: games.length,
    yearRange: [1980, 2024],
    averageRating: games.reduce((sum, game) => sum + game.rating, 0) / games.length,
    yearCounts
  };
}