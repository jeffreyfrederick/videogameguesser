import { NextResponse } from 'next/server';

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const RAWG_BASE_URL = 'https://api.rawg.io/api';

interface RAWGGame {
  id: number;
  name: string;
  background_image: string;
  slug: string;
}

interface RAWGResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RAWGGame[];
}

interface RAWGScreenshot {
  id: number;
  image: string;
}

interface RAWGScreenshotsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RAWGScreenshot[];
}

export async function GET() {
  try {
    if (!RAWG_API_KEY || RAWG_API_KEY === 'your_rawg_api_key_here') {
      console.error('RAWG API key is not configured');
      return NextResponse.json(
        { error: 'Please get a free API key from https://rawg.io/apidocs and add it to your .env.local file' },
        { status: 500 }
      );
    }

    // First, get the total count of games to determine the range
    const countResponse = await fetch(`${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page_size=1`);
    
    if (!countResponse.ok) {
      console.error('Failed to fetch games count:', countResponse.status, countResponse.statusText);
      throw new Error('Failed to fetch games count');
    }
    
    const countData: RAWGResponse = await countResponse.json();
    const totalGames = countData.count;
    const totalPages = Math.ceil(totalGames / 20); // RAWG API uses 20 games per page by default
    
    console.log(`Total games in database: ${totalGames}, Total pages: ${totalPages}`);
    
    // Generate 5 random page numbers
    const randomPages = new Set<number>();
    while (randomPages.size < 5) {
      randomPages.add(Math.floor(Math.random() * totalPages) + 1);
    }
    
    console.log('Fetching games from random pages:', Array.from(randomPages));
    
    // Fetch games from the random pages
    const allGames: RAWGGame[] = [];
    const pagePromises = Array.from(randomPages).map(async (page) => {
      const response = await fetch(`${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page=${page}&page_size=20`);
      if (response.ok) {
        const data: RAWGResponse = await response.json();
        return data.results;
      }
      return [];
    });
    
    const pageResults = await Promise.all(pagePromises);
    pageResults.forEach(games => allGames.push(...games));
    
    console.log(`Fetched ${allGames.length} games from random pages`);
    
    if (allGames.length === 0) {
      throw new Error('No games could be fetched from the random pages');
    }
    
    // Randomly select one game as the correct answer
    const correctGame = allGames[Math.floor(Math.random() * allGames.length)];
    console.log('Selected correct game:', correctGame.name);
    
    // Get screenshots for the correct game
    const screenshotsResponse = await fetch(`${RAWG_BASE_URL}/games/${correctGame.id}/screenshots?key=${RAWG_API_KEY}`);
    
    let screenshot: string | null = null;
    if (screenshotsResponse.ok) {
      const screenshotsData: RAWGScreenshotsResponse = await screenshotsResponse.json();
      if (screenshotsData.results && screenshotsData.results.length > 0) {
        const randomScreenshot = screenshotsData.results[Math.floor(Math.random() * screenshotsData.results.length)];
        screenshot = randomScreenshot.image;
      }
    }
    
    // If no screenshots, skip this game and try another one
    if (!screenshot) {
      console.log(`No screenshots found for ${correctGame.name}, trying another game...`);
      
      // Try to find a game with screenshots from the fetched games
      for (const game of allGames) {
        if (game.id === correctGame.id) continue;
        
        const gameScreenshotsResponse = await fetch(`${RAWG_BASE_URL}/games/${game.id}/screenshots?key=${RAWG_API_KEY}`);
        if (gameScreenshotsResponse.ok) {
          const gameScreenshotsData: RAWGScreenshotsResponse = await gameScreenshotsResponse.json();
          if (gameScreenshotsData.results && gameScreenshotsData.results.length > 0) {
            const randomScreenshot = gameScreenshotsData.results[Math.floor(Math.random() * gameScreenshotsData.results.length)];
            screenshot = randomScreenshot.image;
            correctGame.id = game.id;
            correctGame.name = game.name;
            correctGame.background_image = game.background_image;
            console.log(`Found game with screenshots: ${correctGame.name}`);
            break;
          }
        }
      }
    }
    
    // If still no screenshots, use background image as fallback
    if (!screenshot && correctGame.background_image) {
      screenshot = correctGame.background_image;
      console.log(`Using background image for ${correctGame.name}`);
    }
    
    if (!screenshot) {
      throw new Error('No screenshots or background images available for any of the fetched games');
    }
    
    // Generate incorrect options from the other fetched games
    const incorrectOptions = allGames
      .filter(g => g.id !== correctGame.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .map(g => g.name);
    
    // Create all options and shuffle them
    const allOptions = [correctGame.name, ...incorrectOptions].sort(() => Math.random() - 0.5);
    
    return NextResponse.json({
      game: {
        id: correctGame.id,
        name: correctGame.name,
        background_image: correctGame.background_image,
        slug: correctGame.slug
      },
      screenshot,
      options: allOptions,
      correctAnswer: correctGame.name
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch game' },
      { status: 500 }
    );
  }
}