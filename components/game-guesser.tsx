'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { getRandomGameWithScreenshot } from '@/lib/rawg-api';
import { Game } from '@/lib/types';
import {
  QuizSession,
  createNewSession,
  loadSession,
  clearSession,
  updateSessionGameData,
  submitAnswer,
  advanceToNextQuestion,
  validateQuizIntegrity,
} from '@/lib/quiz-session';
import Image from 'next/image';

const MAX_QUESTIONS = 10;

export default function GameGuesser() {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [currentScreenshot, setCurrentScreenshot] = useState<string>('');
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  // Initialize or load session on mount
  useEffect(() => {
    const existingSession = loadSession();
    
    if (existingSession && validateQuizIntegrity(existingSession)) {
      // Resume existing session
      setSession(existingSession);
      
      if (existingSession.isComplete) {
        setSessionLoaded(true);
        return;
      }
      
      // Check if current question has answered
      const currentIndex = existingSession.currentQuestion - 1;
      const hasAnswered = existingSession.answers.some(a => a.questionIndex === currentIndex);
      
      if (hasAnswered) {
        setShowAnswer(true);
        const answer = existingSession.answers.find(a => a.questionIndex === currentIndex);
        if (answer) {
          setSelectedOption(answer.selectedOption);
        }
      }
      
      // Load current question data
      if (existingSession.gameData[currentIndex]) {
        const gameData = existingSession.gameData[currentIndex];
        setCurrentGame(gameData.game);
        setCurrentScreenshot(gameData.screenshot);
        setOptions(gameData.options);
        setCorrectAnswer(gameData.correctAnswer);
      } else {
        // Need to load new game data
        loadGameForCurrentQuestion(existingSession);
      }
    } else {
      // Create new session
      const newSession = createNewSession();
      setSession(newSession);
      loadGameForCurrentQuestion(newSession);
    }
    
    setSessionLoaded(true);
  }, []);

  const loadGameForCurrentQuestion = async (currentSession: QuizSession) => {
    setLoading(true);
    setError('');
    setShowAnswer(false);
    setSelectedOption('');
    setShowTimeoutWarning(false);
    
    // Show timeout warning after 10 seconds
    const timeoutWarning = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, 10000);
    
    try {
      const { game, screenshot, options, correctAnswer } = await getRandomGameWithScreenshot();
      
      clearTimeout(timeoutWarning);
      
      const gameData = { game, screenshot, options, correctAnswer };
      const currentIndex = currentSession.currentQuestion - 1;
      const updatedSession = updateSessionGameData(currentSession, currentIndex, gameData);
      
      setSession(updatedSession);
      setCurrentGame(game);
      setCurrentScreenshot(screenshot);
      setOptions(options);
      setCorrectAnswer(correctAnswer);
    } catch (err) {
      clearTimeout(timeoutWarning);
      console.error('Error loading game:', err);
      
      let errorMessage = 'Failed to load game. Please try again.';
      
      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out. The server is taking too long to respond. Please try again.';
        } else if (err.message.includes('Network error')) {
          errorMessage = 'Network connection issue. Please check your internet connection and try again.';
        } else if (err.message.includes('HTTP error')) {
          errorMessage = `Server error: ${err.message}. Please try again later.`;
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (!session || showAnswer) return;
    
    try {
      const updatedSession = submitAnswer(session, option);
      setSession(updatedSession);
      setSelectedOption(option);
      setShowAnswer(true);
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError('Failed to submit answer. Please try again.');
    }
  };

  const handleNextQuestion = () => {
    if (!session) return;
    
    try {
      const updatedSession = advanceToNextQuestion(session, MAX_QUESTIONS);
      setSession(updatedSession);
      
      if (updatedSession.isComplete) {
        return; // Will show final score screen
      }
      
      // Load next question
      loadGameForCurrentQuestion(updatedSession);
    } catch (err) {
      console.error('Failed to advance question:', err);
      setError('Failed to advance to next question.');
    }
  };

  const restartGame = () => {
    clearSession();
    const newSession = createNewSession();
    setSession(newSession);
    setSelectedOption('');
    setError('');
    loadGameForCurrentQuestion(newSession);
  };

  // Don't render until session is loaded
  if (!sessionLoaded || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading quiz...</div>
      </div>
    );
  }

  const testAPI = async () => {
    try {
      const response = await fetch('/api/test');
      const data = await response.json();
      console.log('API Test Result:', data);
      alert(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Test failed:', err);
      alert('Test failed: ' + String(err));
    }
  };

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-red-500">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <div className="space-y-2 mt-4">
            <Button onClick={() => loadGameForCurrentQuestion(session)} className="w-full">
              Try Again
            </Button>
            <Button onClick={testAPI} variant="outline" className="w-full">
              Test API Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Final Score Screen
  if (session.isComplete) {
    const percentage = Math.round((session.score / MAX_QUESTIONS) * 100);
    const getScoreMessage = () => {
      if (percentage === 100) return "Perfect! 🏆";
      if (percentage >= 80) return "Excellent! 🌟";
      if (percentage >= 60) return "Good Job! 👏";
      if (percentage >= 40) return "Not Bad! 👍";
      return "Keep Trying! 💪";
    };

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
                🎮
              </div>
              <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
              <CardDescription className="text-lg">
                {getScoreMessage()}
              </CardDescription>
              <Badge variant="secondary" className="mt-2 text-xs">
                Session: {session.id.slice(0, 8)}...
              </Badge>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div>
                <div className="text-4xl font-bold text-primary mb-2">
                  {session.score}/{MAX_QUESTIONS}
                </div>
                <div className="text-xl text-muted-foreground mb-4">
                  {percentage}% Correct
                </div>
                <Progress value={percentage} className="w-full h-3" />
              </div>
              <Button onClick={restartGame} size="lg" className="w-full">
                Start New Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="max-w-2xl mx-auto space-y-6 py-8 mt-4">
        {/* Header with Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Video Game Guesser</CardTitle>
                <CardDescription>
                  Question {session.currentQuestion} of {MAX_QUESTIONS}
                </CardDescription>
                <Badge variant="outline" className="mt-2 font-semibold text-xs">
                  Session: {session.id.slice(0, 8)}...
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{session.score}</div>
                <div className="text-sm text-muted-foreground">Score</div>
              </div>
            </div>
            <Progress 
              value={(session.currentQuestion / MAX_QUESTIONS) * 100} 
              className="mt-4" 
            />
          </CardHeader>
        </Card>

        {/* Game Card */}
        <Card>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-80 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <div className="text-lg text-muted-foreground text-center">
                  <div>Loading random game...</div>
                  <div className="text-sm mt-2">This may take a few seconds</div>
                  {showTimeoutWarning && (
                    <div className="text-amber-600 dark:text-amber-400 mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                      ⚠️ Taking longer than expected. You can retry or wait a bit more.
                    </div>
                  )}
                </div>
                <Button 
                  onClick={() => loadGameForCurrentQuestion(session)} 
                  variant="outline" 
                  size="sm"
                >
                  Retry
                </Button>
              </div>
            ) : currentScreenshot ? (
              <div className="space-y-6">
                <div className="relative w-full h-80 rounded-lg overflow-hidden border">
                  <Image
                    src={currentScreenshot}
                    alt="Game screenshot"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                
                {!showAnswer && options.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-center">
                      What game is this?
                    </h3>
                    <div className="grid gap-2">
                      {options.map((option, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="h-auto py-3 px-4 text-left justify-start"
                          onClick={() => handleOptionSelect(option)}
                        >
                          <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span>
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {showAnswer && currentGame && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-4">
                        {correctAnswer}
                      </h3>
                      {selectedOption && (
                        <div className={`p-4 rounded-lg border ${
                          selectedOption === correctAnswer 
                            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200' 
                            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200'
                        }`}>
                          <p className="font-semibold mb-2">
                            {selectedOption === correctAnswer ? '✅ Correct!' : '❌ Incorrect'}
                          </p>
                          {selectedOption !== correctAnswer && (
                            <p className="text-sm">Your guess: {selectedOption}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={handleNextQuestion} 
                      size="lg"
                      className="w-full"
                    >
                      {session.currentQuestion >= MAX_QUESTIONS ? 'View Results' : 'Next Question'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-80">
                <div className="text-lg text-muted-foreground">No screenshot available</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}