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

// Helper function to fetch with retry logic
async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000), // 10 second timeout per request
      });
      
      if (response.ok) {
        return response;
      }
      
      // If it's a server error (5xx), retry
      if (response.status >= 500 && response.status < 600) {
        if (i === retries - 1) throw new Error(`Server error: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        continue;
      }
      
      // If it's a client error (4xx), don't retry
      throw new Error(`Client error: ${response.status}`);
      
    } catch (error) {
      if (i === retries - 1) throw error;
      if (error instanceof Error && error.name === 'TimeoutError') {
        console.log(`Request timeout, retrying... (attempt ${i + 1}/${retries})`);
      }
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  
  throw new Error('Max retries exceeded');
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
    const countResponse = await fetchWithRetry(`${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page_size=1`);
    
    const countData: RAWGResponse = await countResponse.json();
    const totalGames = countData.count;
    const totalPages = Math.ceil(totalGames / 20); // RAWG API uses 20 games per page by default
    
    console.log(`Total games in database: ${totalGames}, Total pages: ${totalPages}`);
    
    // Generate 10 random page numbers, avoiding very high page numbers that might be slow
    const maxPage = Math.min(totalPages, 40000); // Limit to first 40k pages for better performance
    const randomPages = new Set<number>();
    while (randomPages.size < 10) {
      randomPages.add(Math.floor(Math.random() * maxPage) + 1);
    }
    
    console.log('Fetching games from 10 random pages:', Array.from(randomPages));
    
    // Fetch games from the random pages with retry logic
    const allGames: RAWGGame[] = [];
    const pagePromises = Array.from(randomPages).map(async (page) => {
      try {
        const response = await fetchWithRetry(`${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&page=${page}&page_size=20`);
        const data: RAWGResponse = await response.json();
        return data.results;
      } catch (error) {
        console.error(`Failed to fetch page ${page}:`, error);
        return [];
      }
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
    let screenshot: string | null = null;
    try {
      const screenshotsResponse = await fetchWithRetry(`${RAWG_BASE_URL}/games/${correctGame.id}/screenshots?key=${RAWG_API_KEY}`);
      const screenshotsData: RAWGScreenshotsResponse = await screenshotsResponse.json();
      if (screenshotsData.results && screenshotsData.results.length > 0) {
        const lastScreenshot = screenshotsData.results[screenshotsData.results.length - 1];
        screenshot = lastScreenshot.image;
      }
    } catch (error) {
      console.log(`Failed to fetch screenshots for ${correctGame.name}:`, error);
    }
    
    // If no screenshots, try to find a game with screenshots from the fetched games
    if (!screenshot) {
      console.log(`No screenshots found for ${correctGame.name}, trying another game...`);
      
      for (const game of allGames) {
        if (game.id === correctGame.id) continue;
        
        try {
          const gameScreenshotsResponse = await fetchWithRetry(`${RAWG_BASE_URL}/games/${game.id}/screenshots?key=${RAWG_API_KEY}`);
          const gameScreenshotsData: RAWGScreenshotsResponse = await gameScreenshotsResponse.json();
          if (gameScreenshotsData.results && gameScreenshotsData.results.length > 0) {
            const lastScreenshot = gameScreenshotsData.results[gameScreenshotsData.results.length - 1];
            screenshot = lastScreenshot.image;
            correctGame.id = game.id;
            correctGame.name = game.name;
            correctGame.background_image = game.background_image;
            console.log(`Found game with screenshots: ${correctGame.name}`);
            break;
          }
        } catch (error) {
          console.log(`Failed to fetch screenshots for ${game.name}:`, error);
          continue;
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