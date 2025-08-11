import fs from 'fs';
import path from 'path';
import { GameWithOptions } from './types';

interface CSVGame {
  id: string;
  name: string;
  category: string;
  release_date: string;
  rating: string;
  aggregated_rating: string;
  genres: string;
  themes: string;
  franchise: string;
  series: string;
  main_developers: string;
  supporting_developers: string;
  publishers: string;
  platforms: string;
  player_perspectives: string;
  game_modes: string;
  game_engines: string;
  similar_games: string;
  keywords: string;
  cover_url: string;
  summary: string;
  screenshot_urls: string;
  artwork_urls: string;
}

let gamesCache: CSVGame[] | null = null;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function loadGamesFromCSV(): CSVGame[] {
  if (gamesCache) {
    return gamesCache;
  }

  const csvPath = path.join(process.cwd(), 'game_dataset.csv');
  
  console.log('Loading CSV data...');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvData.split('\n');
  
  console.log(`Processing ${lines.length} lines...`);
  
  // Skip header row
  const games: CSVGame[] = [];
  
  // Process lines in chunks to avoid blocking
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Quick parsing for performance - split by comma but handle quotes
    const values = parseCSVLine(line);
    if (values.length < 23) continue; // Skip malformed lines
    
    // Only process main games with ratings to improve performance
    if (values[2] !== 'main_game' || !values[4] || parseFloat(values[4]) < 60) {
      continue;
    }
    
    const game: CSVGame = {
      id: values[0],
      name: values[1],
      category: values[2],
      release_date: values[3],
      rating: values[4],
      aggregated_rating: values[5],
      genres: values[6],
      themes: values[7],
      franchise: values[8],
      series: values[9],
      main_developers: values[10],
      supporting_developers: values[11],
      publishers: values[12],
      platforms: values[13],
      player_perspectives: values[14],
      game_modes: values[15],
      game_engines: values[16],
      similar_games: values[17],
      keywords: values[18],
      cover_url: values[19],
      summary: values[20],
      screenshot_urls: values[21],
      artwork_urls: values[22]
    };
    
    games.push(game);
    
    // Log progress every 10000 games
    if (i % 10000 === 0) {
      console.log(`Processed ${i} lines, found ${games.length} qualified games`);
    }
  }
  
  gamesCache = games;
  console.log(`Loaded ${games.length} qualified games from CSV (filtered from ${lines.length} total)`);
  return games;
}

function parseScreenshotUrls(screenshotUrlsStr: string): string[] {
  if (!screenshotUrlsStr || screenshotUrlsStr === '') return [];
  
  try {
    // Remove outer brackets and parse as JSON array
    const cleaned = screenshotUrlsStr.replace(/^\[|\]$/g, '');
    if (!cleaned) return [];
    
    // Split by comma and clean up each URL
    const urls = cleaned
      .split("', '")
      .map(url => url.replace(/^'|'$/g, '').trim())
      .filter(url => url.length > 0);
    
    return urls;
  } catch (error) {
    console.log('Failed to parse screenshot URLs:', screenshotUrlsStr);
    return [];
  }
}

function getGamesWithScreenshots(games: CSVGame[]): CSVGame[] {
  return games.filter(game => {
    const screenshots = parseScreenshotUrls(game.screenshot_urls);
    return screenshots.length > 0;
  });
}

function getHighRatedGamesFromYear(games: CSVGame[], year: number): CSVGame[] {
  return games
    .filter(game => {
      if (!game.release_date) return false;
      const gameYear = new Date(game.release_date).getFullYear();
      return gameYear === year && game.category === 'main_game';
    })
    .filter(game => {
      const rating = parseFloat(game.rating);
      return !isNaN(rating) && rating > 70; // Only games with rating > 70
    })
    .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating)); // Sort by rating desc
}

export async function getRandomGameWithScreenshot(): Promise<GameWithOptions> {
  try {
    const games = loadGamesFromCSV();
    console.log(`Total games loaded: ${games.length}`);
    
    // Generate a random year between 1990 and 2024
    const randomYear = Math.floor(Math.random() * (2024 - 1990 + 1)) + 1990;
    console.log(`Fetching games from year ${randomYear}`);
    
    // Get high-rated games from the random year
    let yearGames = getHighRatedGamesFromYear(games, randomYear);
    console.log(`Found ${yearGames.length} high-rated games from ${randomYear}`);
    
    // If no games from that year, fall back to all high-rated games
    if (yearGames.length === 0) {
      console.log('No games found for that year, using all high-rated games');
      yearGames = games
        .filter(game => {
          const rating = parseFloat(game.rating);
          return !isNaN(rating) && rating > 75 && game.category === 'main_game';
        })
        .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
        .slice(0, 100); // Take top 100 to avoid performance issues
    }
    
    // Filter games that have screenshots
    const gamesWithScreenshots = getGamesWithScreenshots(yearGames);
    console.log(`Found ${gamesWithScreenshots.length} games with screenshots`);
    
    if (gamesWithScreenshots.length === 0) {
      throw new Error('No games with screenshots found');
    }
    
    // Select a random game
    const correctGame = gamesWithScreenshots[Math.floor(Math.random() * gamesWithScreenshots.length)];
    console.log(`Selected correct game: ${correctGame.name}`);
    
    // Get a random screenshot from the game
    const screenshots = parseScreenshotUrls(correctGame.screenshot_urls);
    const randomScreenshot = screenshots[Math.floor(Math.random() * screenshots.length)];
    
    // Create incorrect options from other games in the same dataset
    const otherGames = yearGames
      .filter(g => g.id !== correctGame.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    // Create all options and shuffle them
    const allOptions = [correctGame.name, ...otherGames.map(g => g.name)]
      .sort(() => Math.random() - 0.5);
    
    return {
      game: {
        id: parseInt(correctGame.id),
        name: correctGame.name,
        background_image: correctGame.cover_url,
        slug: correctGame.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      },
      screenshot: randomScreenshot,
      options: allOptions,
      correctAnswer: correctGame.name
    };
    
  } catch (error) {
    console.error('Error loading game from CSV:', error);
    throw new Error(`Failed to load game: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}