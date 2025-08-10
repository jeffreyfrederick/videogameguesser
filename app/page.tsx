import GameGuesser from '@/components/game-guesser';

export default function Home() {
  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="container mx-auto py-8">
        <GameGuesser />
      </div>
    </div>
  );
}
