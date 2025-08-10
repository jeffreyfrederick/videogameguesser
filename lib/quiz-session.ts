import { Game } from './types';

export interface QuizAnswer {
  questionIndex: number;
  selectedOption: string;
  correctAnswer: string;
  isCorrect: boolean;
  answeredAt: number;
}

export interface QuizSession {
  id: string;
  startedAt: number;
  currentQuestion: number;
  score: number;
  answers: QuizAnswer[];
  gameData: {
    game: Game;
    screenshot: string;
    options: string[];
    correctAnswer: string;
  }[];
  isComplete: boolean;
  completedAt?: number;
}

const STORAGE_KEY = 'videogame-quiz-session';

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export function createNewSession(): QuizSession {
  const session: QuizSession = {
    id: generateSessionId(),
    startedAt: Date.now(),
    currentQuestion: 1,
    score: 0,
    answers: [],
    gameData: [],
    isComplete: false,
  };
  
  saveSession(session);
  return session;
}

export function saveSession(session: QuizSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save quiz session:', error);
  }
}

export function loadSession(): QuizSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const session = JSON.parse(stored) as QuizSession;
    
    // Validate session integrity
    if (!session.id || !session.startedAt || session.currentQuestion < 1) {
      clearSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Failed to load quiz session:', error);
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear quiz session:', error);
  }
}

export function updateSessionGameData(session: QuizSession, questionIndex: number, gameData: QuizSession['gameData'][0]): QuizSession {
  const updatedSession = {
    ...session,
    gameData: [...session.gameData]
  };
  
  // Ensure we have the right number of game data entries
  while (updatedSession.gameData.length <= questionIndex) {
    updatedSession.gameData.push({
      game: gameData.game,
      screenshot: gameData.screenshot,
      options: gameData.options,
      correctAnswer: gameData.correctAnswer,
    });
  }
  
  updatedSession.gameData[questionIndex] = gameData;
  saveSession(updatedSession);
  return updatedSession;
}

export function submitAnswer(session: QuizSession, selectedOption: string): QuizSession {
  const currentIndex = session.currentQuestion - 1;
  const gameData = session.gameData[currentIndex];
  
  if (!gameData) {
    throw new Error('No game data found for current question');
  }
  
  const isCorrect = selectedOption === gameData.correctAnswer;
  
  const answer: QuizAnswer = {
    questionIndex: currentIndex,
    selectedOption,
    correctAnswer: gameData.correctAnswer,
    isCorrect,
    answeredAt: Date.now(),
  };
  
  const updatedSession: QuizSession = {
    ...session,
    score: isCorrect ? session.score + 1 : session.score,
    answers: [...session.answers, answer],
  };
  
  saveSession(updatedSession);
  return updatedSession;
}

export function advanceToNextQuestion(session: QuizSession, maxQuestions: number): QuizSession {
  const updatedSession: QuizSession = {
    ...session,
    currentQuestion: session.currentQuestion + 1,
  };
  
  if (updatedSession.currentQuestion > maxQuestions) {
    updatedSession.isComplete = true;
    updatedSession.completedAt = Date.now();
  }
  
  saveSession(updatedSession);
  return updatedSession;
}

export function validateQuizIntegrity(session: QuizSession): boolean {
  // Check if session is valid
  if (!session.id || !session.startedAt) return false;
  
  // Check if answers are in correct order
  for (let i = 0; i < session.answers.length; i++) {
    if (session.answers[i].questionIndex !== i) return false;
  }
  
  // Check if current question matches answers length + 1
  if (session.currentQuestion !== session.answers.length + 1) return false;
  
  // Check timestamps are reasonable
  const now = Date.now();
  if (session.startedAt > now) return false;
  
  for (const answer of session.answers) {
    if (answer.answeredAt < session.startedAt || answer.answeredAt > now) return false;
  }
  
  return true;
}