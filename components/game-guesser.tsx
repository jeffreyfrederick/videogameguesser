'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getRandomGameWithScreenshot } from '@/lib/rawg-api';
import { Game } from '@/lib/types';
import Image from 'next/image';

export default function GameGuesser() {
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [currentScreenshot, setCurrentScreenshot] = useState<string>('');
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
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
    
    setTotalGames(totalGames + 1);
    setShowAnswer(true);
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

  return (
    <div className="space-y-6">
      {/* Score */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Video Game Guesser</CardTitle>
          <CardDescription>
            Score: {score} / {totalGames} 
            {totalGames > 0 && ` (${Math.round((score / totalGames) * 100)}%)`}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Game Screenshot */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-lg">Loading game...</div>
            </div>
          ) : currentScreenshot ? (
            <div className="space-y-4">
              <div className="relative w-full h-96 rounded-lg overflow-hidden">
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
                  <div>
                    <h3 className="text-lg font-medium mb-4 text-center">
                      What game is this?
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {options.map((option, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="h-auto py-3 px-4 text-left justify-start"
                          onClick={() => handleOptionSelect(option)}
                        >
                          <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {showAnswer && currentGame && (
                <div className="space-y-4 p-4 bg-secondary rounded-lg">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
                      Correct Answer: {correctAnswer}
                    </h3>
                    {selectedOption && (
                      <div className={`text-sm mt-2 p-2 rounded ${
                        selectedOption === correctAnswer 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        <p className="font-medium">
                          {selectedOption === correctAnswer ? '✅ Correct!' : '❌ Incorrect'}
                        </p>
                        {selectedOption !== correctAnswer && (
                          <p>Your guess: {selectedOption}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <Button onClick={loadNewGame} className="w-full">
                    Next Game
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-lg">No screenshot available</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}