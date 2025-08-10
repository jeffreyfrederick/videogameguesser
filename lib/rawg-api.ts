import { GameWithOptions } from './types';

export async function getRandomGameWithScreenshot(): Promise<GameWithOptions> {
  const response = await fetch('/api/game/random');
  
  if (!response.ok) {
    throw new Error('Failed to fetch game');
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error);
  }
  
  return data;
}