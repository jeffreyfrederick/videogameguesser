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
    
    // Create incorrect options from other games
    const otherGames = yearGames
      .filter(g => g.id !== correctGame.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    // Ensure we have enough options
    if (otherGames.length < 3) {
      // Fill with random high-rated games if needed
      const additionalGames = getHighRatedGames(78)
        .filter(g => g.id !== correctGame.id && !otherGames.find(og => og.id === g.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3 - otherGames.length);
      
      otherGames.push(...additionalGames);
    }
    
    // Create all options and shuffle them
    const allOptions = [correctGame.name, ...otherGames.map(g => g.name)]
      .sort(() => Math.random() - 0.5);
    
    console.log(`🎲 Generated options: ${allOptions.join(', ')}`);
    
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