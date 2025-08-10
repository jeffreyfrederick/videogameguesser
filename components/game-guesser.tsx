'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ThemeToggle } from '@/components/theme-toggle';
import { getRandomGameWithScreenshot } from '@/lib/rawg-api';
import { Game } from '@/lib/types';
import Image from 'next/image';

const MAX_QUESTIONS = 5;

export default function GameGuesser() {
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [currentScreenshot, setCurrentScreenshot] = useState<string>('');
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [gameComplete, setGameComplete] = useState(false);
  const [error, setError] = useState<string>('');

  const loadNewGame = async () => {
    setLoading(true);
    setError('');
    setShowAnswer(false);
    setSelectedOption('');
    
    try {
      const { game, screenshot, options, correctAnswer } = await getRandomGameWithScreenshot();
      setCurrentGame(game);
      setCurrentScreenshot(screenshot);
      setOptions(options);
      setCorrectAnswer(correctAnswer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load game. Please try again.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (showAnswer) return;
    
    setSelectedOption(option);
    const isCorrect = option === correctAnswer;
    
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setShowAnswer(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion >= MAX_QUESTIONS) {
      setGameComplete(true);
    } else {
      setCurrentQuestion(currentQuestion + 1);
      loadNewGame();
    }
  };

  const restartGame = () => {
    setScore(0);
    setCurrentQuestion(1);
    setGameComplete(false);
    setShowAnswer(false);
    setSelectedOption('');
    loadNewGame();
  };

  useEffect(() => {
    loadNewGame();
  }, []);

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
            <Button onClick={loadNewGame} className="w-full">
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
  if (gameComplete) {
    const percentage = Math.round((score / MAX_QUESTIONS) * 100);
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
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div>
                <div className="text-4xl font-bold text-primary mb-2">
                  {score}/{MAX_QUESTIONS}
                </div>
                <div className="text-xl text-muted-foreground mb-4">
                  {percentage}% Correct
                </div>
                <Progress value={percentage} className="w-full h-3" />
              </div>
              <Button onClick={restartGame} size="lg" className="w-full">
                Play Again
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
                  Question {currentQuestion} of {MAX_QUESTIONS}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{score}</div>
                <div className="text-sm text-muted-foreground">Score</div>
              </div>
            </div>
            <Progress 
              value={(currentQuestion / MAX_QUESTIONS) * 100} 
              className="mt-4" 
            />
          </CardHeader>
        </Card>

        {/* Game Card */}
        <Card>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-80">
                <div className="text-lg text-muted-foreground">Loading game...</div>
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
                      {currentQuestion >= MAX_QUESTIONS ? 'View Results' : 'Next Question'}
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