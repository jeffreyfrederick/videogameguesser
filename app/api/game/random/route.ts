import { NextResponse } from 'next/server';

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const RAWG_BASE_URL = 'https://api.rawg.io/api';

// Popular games with screenshots - these are guaranteed to have screenshots
const POPULAR_GAMES = [
  { id: 3498, name: 'Grand Theft Auto V' },
  { id: 4200, name: 'Portal 2' },
  { id: 5286, name: 'Tomb Raider' },
  { id: 28, name: 'Red Dead Redemption 2' },
  { id: 58175, name: 'God of War' },
  { id: 4062, name: 'BioShock Infinite' },
  { id: 802, name: 'Borderlands 2' },
  { id: 13537, name: 'The Witcher 3: Wild Hunt' },
  { id: 1030, name: 'Limbo' },
  { id: 17540, name: 'Injustice: Gods Among Us' },
  { id: 11859, name: 'Team Fortress 2' },
  { id: 3939, name: 'PAYDAY 2' },
  { id: 4291, name: 'Counter-Strike: Global Offensive' },
  { id: 5563, name: 'Fallout: New Vegas' },
  { id: 278, name: 'Horizon Zero Dawn' },
  { id: 1447, name: 'Deus Ex: Human Revolution' },
  { id: 19709, name: 'Half-Life 2' },
  { id: 5679, name: 'The Elder Scrolls V: Skyrim' },
  { id: 4166, name: 'Mass Effect 2' },
  { id: 41494, name: 'Cyberpunk 2077' },
  { id: 3070, name: 'Fallout 4' },
  { id: 1030, name: 'Left 4 Dead 2' },
  { id: 5583, name: 'Hitman: Absolution' },
  { id: 4286, name: 'Bioshock' },
  { id: 11936, name: 'Minecraft' },
];

export async function GET() {
  try {
    if (!RAWG_API_KEY || RAWG_API_KEY === 'your_rawg_api_key_here') {
      console.error('RAWG API key is not configured');
      return NextResponse.json(
        { error: 'Please get a free API key from https://rawg.io/apidocs and add it to your .env.local file' },
        { status: 500 }
      );
    }

    // Pick a random game from our curated list
    const correctGame = POPULAR_GAMES[Math.floor(Math.random() * POPULAR_GAMES.length)];
    
    console.log('Fetching game details for:', correctGame.name);
    
    // Get game details
    const gameResponse = await fetch(`${RAWG_BASE_URL}/games/${correctGame.id}?key=${RAWG_API_KEY}`);
    
    if (!gameResponse.ok) {
      console.error('Failed to fetch game details:', gameResponse.status, gameResponse.statusText);
      throw new Error('Failed to fetch game details');
    }
    
    const game = await gameResponse.json();
    console.log('Fetched game:', game.name);
    
    // Get screenshots for this game
    const screenshotsResponse = await fetch(`${RAWG_BASE_URL}/games/${correctGame.id}/screenshots?key=${RAWG_API_KEY}`);
    
    let screenshot;
    if (screenshotsResponse.ok) {
      const screenshotsData = await screenshotsResponse.json();
      if (screenshotsData.results && screenshotsData.results.length > 0) {
        const randomScreenshot = screenshotsData.results[Math.floor(Math.random() * screenshotsData.results.length)];
        screenshot = randomScreenshot.image;
      }
    }
    
    // Fallback to background image
    if (!screenshot && game.background_image) {
      screenshot = game.background_image;
    }
    
    if (!screenshot) {
      throw new Error('No screenshots available for this game');
    }
    
    // Generate 5 random incorrect options
    const incorrectOptions = POPULAR_GAMES
      .filter(g => g.id !== correctGame.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .map(g => g.name);
    
    // Create all options and shuffle them
    const allOptions = [game.name, ...incorrectOptions].sort(() => Math.random() - 0.5);
    
    return NextResponse.json({
      game,
      screenshot,
      options: allOptions,
      correctAnswer: game.name
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch game' },
      { status: 500 }
    );
  }
}