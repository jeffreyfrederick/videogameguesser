import { GameWithOptions } from './types';
import { getRandomGameWithScreenshot as getCuratedGame } from './curated-games-loader';

export async function getRandomGameWithScreenshot(): Promise<GameWithOptions> {
  // Use curated games directly for faster performance
  return getCuratedGame();
}