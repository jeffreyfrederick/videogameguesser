export interface Game {
  id: number;
  name: string;
  background_image: string;
  screenshots?: Screenshot[];
}

export interface Screenshot {
  id: number;
  image: string;
}

export interface GameScreenshots {
  results: Screenshot[];
}

export interface GameWithOptions {
  game: Game;
  screenshot: string;
  options: string[];
  correctAnswer: string;
}