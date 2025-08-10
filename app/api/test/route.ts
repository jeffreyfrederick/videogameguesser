import { NextResponse } from 'next/server';

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const RAWG_BASE_URL = 'https://api.rawg.io/api';

export async function GET() {
  try {
    console.log('API Key exists:', !!RAWG_API_KEY);
    
    if (!RAWG_API_KEY || RAWG_API_KEY === 'your_rawg_api_key_here') {
      return NextResponse.json({
        error: 'API key not configured. Please add RAWG_API_KEY to your .env.local file',
        hasKey: false
      });
    }

    // Test simple games endpoint
    const testUrl = `${RAWG_BASE_URL}/games/3498?key=${RAWG_API_KEY}`;
    console.log('Testing URL (key hidden):', testUrl.replace(RAWG_API_KEY, '[KEY]'));
    
    const response = await fetch(testUrl);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      
      return NextResponse.json({
        error: 'RAWG API request failed',
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText.substring(0, 500)
      });
    }
    
    const game = await response.json();
    console.log('Success! Game name:', game.name);
    
    return NextResponse.json({
      success: true,
      message: 'API is working!',
      game: {
        id: game.id,
        name: game.name,
        background_image: game.background_image
      }
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}