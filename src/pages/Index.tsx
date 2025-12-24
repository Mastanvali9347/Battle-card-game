import { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, Swords, Shield, Zap, Trophy, RotateCcw, Clock, X, Star, Flame, ArrowLeft, Play, Home, Lock } from 'lucide-react';
import {
  playCardFlip,
  playMatch,
  playPlayerAttack,
  playEnemyHit,
  playMismatch,
  playEnemyAttack,
  playPlayerHit,
  playVictory,
  playDefeat,
  playChampion,
  playCombo,
  playLevelUp,
  resumeAudio,
} from '@/lib/sounds';
import { getCardImage } from '@/lib/cardImages';

// Enemy configurations with unique abilities
interface EnemyType {
  emoji: string;
  name: string;
  color: string;
  ability: string;
  abilityDescription: string;
}

const ENEMIES: EnemyType[] = [
  { emoji: '🐺', name: 'Wolf', color: 'enemy-wolf', ability: 'pack', abilityDescription: 'Weak but quick attacks' },
  { emoji: '🧟', name: 'Zombie', color: 'enemy-zombie', ability: 'poison', abilityDescription: 'Slow but deals poison damage' },
  { emoji: '🦇', name: 'Vampire', color: 'enemy-vampire', ability: 'drain', abilityDescription: 'Steals health on hit' },
  { emoji: '💀', name: 'Skeleton', color: 'enemy-skeleton', ability: 'curse', abilityDescription: 'Reduces your damage' },
  { emoji: '🐲', name: 'Dragon Lord', color: 'enemy-dragon', ability: 'fire', abilityDescription: 'Ultimate power!' },
];

// Level configurations
const LEVELS = [
  {
    level: 1,
    name: 'Forest',
    pairs: 2,
    words: ['Punch', 'Kick'],
    enemyHp: 40,
    enemyDamage: 10,
    playerDamage: 20,
    enemy: ENEMIES[0],
  },
  {
    level: 2,
    name: 'Graveyard',
    pairs: 3,
    words: ['Sword', 'Bow', 'Axe'],
    enemyHp: 60,
    enemyDamage: 12,
    playerDamage: 20,
    enemy: ENEMIES[1],
  },
  {
    level: 3,
    name: 'Castle',
    pairs: 4,
    words: ['Fire', 'Ice', 'Dark', 'Light'],
    enemyHp: 80,
    enemyDamage: 15,
    playerDamage: 20,
    enemy: ENEMIES[2],
  },
  {
    level: 4,
    name: 'Dungeon',
    pairs: 6,
    words: ['Thunder', 'Wind', 'Earth', 'Water', 'Shadow', 'Holy'],
    enemyHp: 100,
    enemyDamage: 20,
    playerDamage: 17,
    enemy: ENEMIES[3],
  },
  {
    level: 5,
    name: 'Dragon Lair',
    pairs: 8,
    words: ['Dragon', 'Phoenix', 'Titan', 'Demon', 'Angel', 'Reaper', 'Storm', 'Chaos'],
    enemyHp: 150,
    enemyDamage: 25,
    playerDamage: 19,
    enemy: ENEMIES[4],
  },
];

interface Card {
  id: number;
  word: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface HighScore {
  time: number;
  mistakes: number;
  date: string;
}

type GameState = 'start' | 'levelSelect' | 'playing' | 'victory' | 'defeat' | 'champion';

const UNLOCKED_LEVELS_KEY = 'battle-card-matcher-unlocked';

const STORAGE_KEY = 'battle-card-matcher-highscores';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const loadHighScores = (): HighScore[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveHighScore = (score: HighScore): HighScore[] => {
  const scores = loadHighScores();
  scores.push(score);
  // Sort by time (ascending), then by mistakes (ascending)
  scores.sort((a, b) => a.time - b.time || a.mistakes - b.mistakes);
  // Keep only top 5
  const topScores = scores.slice(0, 5);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(topScores));
  return topScores;
};

const loadUnlockedLevels = (): number => {
  try {
    const stored = localStorage.getItem(UNLOCKED_LEVELS_KEY);
    return stored ? parseInt(stored, 10) : 1;
  } catch {
    return 1;
  }
};

const saveUnlockedLevels = (level: number) => {
  localStorage.setItem(UNLOCKED_LEVELS_KEY, level.toString());
};

const BattleCardMatcher = () => {
  const [gameState, setGameState] = useState<GameState>('start');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(LEVELS[0].enemyHp);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [playerAttacking, setPlayerAttacking] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  const [matchedPairs, setMatchedPairs] = useState(0);
  
  // Combo system
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [lastDamage, setLastDamage] = useState(0);
  
  // High score tracking
  const [elapsedTime, setElapsedTime] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [unlockedLevels, setUnlockedLevels] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const levelConfig = LEVELS[currentLevel];
  const maxPlayerHp = 100;
  
  // Calculate combo damage multiplier
  const getComboMultiplier = (comboCount: number) => {
    if (comboCount >= 5) return 2.0;
    if (comboCount >= 3) return 1.5;
    if (comboCount >= 2) return 1.25;
    return 1.0;
  };

  // Load high scores and unlocked levels on mount
  useEffect(() => {
    setHighScores(loadHighScores());
    setUnlockedLevels(loadUnlockedLevels());
  }, []);

  // Timer effect
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState]);

  // Generate shuffled cards for current level
  const generateCards = useCallback((levelIndex: number) => {
    const config = LEVELS[levelIndex];
    const cardPairs: Card[] = [];
    
    config.words.forEach((word, index) => {
      cardPairs.push(
        { id: index * 2, word, isFlipped: false, isMatched: false },
        { id: index * 2 + 1, word, isFlipped: false, isMatched: false }
      );
    });
    
    // Shuffle cards
    for (let i = cardPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
    }
    
    return cardPairs;
  }, []);

  // Start the game from beginning
  const startGame = async () => {
    await resumeAudio();
    setGameState('playing');
    setCurrentLevel(0);
    setPlayerHp(100);
    setEnemyHp(LEVELS[0].enemyHp);
    setCards(generateCards(0));
    setFlippedCards([]);
    setMatchedPairs(0);
    setElapsedTime(0);
    setMistakes(0);
    setIsNewHighScore(false);
    setCombo(0);
    setShowCombo(false);
  };

  // Start from specific level
  const startLevel = async (levelIndex: number) => {
    await resumeAudio();
    setGameState('playing');
    setCurrentLevel(levelIndex);
    setPlayerHp(100);
    setEnemyHp(LEVELS[levelIndex].enemyHp);
    setCards(generateCards(levelIndex));
    setFlippedCards([]);
    setMatchedPairs(0);
    setElapsedTime(0);
    setMistakes(0);
    setIsNewHighScore(false);
    setCombo(0);
    setShowCombo(false);
  };

  // Go back to main menu
  const goToMenu = () => {
    setGameState('start');
  };

  // Open level select
  const openLevelSelect = () => {
    setGameState('levelSelect');
  };

  // Start next level
  const startNextLevel = useCallback(() => {
    const nextLevel = currentLevel + 1;
    if (nextLevel >= LEVELS.length) {
      // Game complete - save high score
      playChampion();
      const newScore: HighScore = {
        time: elapsedTime,
        mistakes,
        date: new Date().toLocaleDateString(),
      };
      const updatedScores = saveHighScore(newScore);
      setHighScores(updatedScores);
      // Check if this is a new best score
      if (updatedScores[0].time === elapsedTime && updatedScores[0].mistakes === mistakes) {
        setIsNewHighScore(true);
      }
      // Unlock all levels after completion
      if (unlockedLevels < LEVELS.length) {
        setUnlockedLevels(LEVELS.length);
        saveUnlockedLevels(LEVELS.length);
      }
      setGameState('champion');
    } else {
      playLevelUp();
      // Unlock next level
      if (nextLevel + 1 > unlockedLevels) {
        setUnlockedLevels(nextLevel + 1);
        saveUnlockedLevels(nextLevel + 1);
      }
      setCurrentLevel(nextLevel);
      setEnemyHp(LEVELS[nextLevel].enemyHp);
      setCards(generateCards(nextLevel));
      setFlippedCards([]);
      setMatchedPairs(0);
      setCombo(0);
      setGameState('playing');
    }
  }, [currentLevel, generateCards, elapsedTime, mistakes, unlockedLevels]);

  // Handle card click
  const handleCardClick = (cardId: number) => {
    if (isChecking || gameState !== 'playing') return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    
    if (flippedCards.length >= 2) return;

    // Play card flip sound
    playCardFlip();

    // Flip the card
    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));
    
    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    // Check for match when 2 cards are flipped
    if (newFlipped.length === 2) {
      setIsChecking(true);
      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      setTimeout(() => {
        if (firstCard && secondCard && firstCard.word === secondCard.word) {
          // Match found - Player attacks with combo!
          const newCombo = combo + 1;
          setCombo(newCombo);
          
          // Calculate damage with combo multiplier
          const multiplier = getComboMultiplier(newCombo);
          const damage = Math.floor(levelConfig.playerDamage * multiplier);
          setLastDamage(damage);
          
          // Show combo indicator
          if (newCombo >= 2) {
            setShowCombo(true);
            playCombo(newCombo);
            setTimeout(() => setShowCombo(false), 1000);
          }
          
          // Play sounds
          playMatch(newCombo);
          playPlayerAttack();
          
          setPlayerAttacking(true);
          setTimeout(() => {
            setPlayerAttacking(false);
            playEnemyHit();
            setEnemyHit(true);
            setTimeout(() => setEnemyHit(false), 300);
          }, 200);

          setCards(prev => prev.map(c => 
            c.id === firstId || c.id === secondId 
              ? { ...c, isMatched: true } 
              : c
          ));
          setEnemyHp(prev => Math.max(0, prev - damage));
          setMatchedPairs(prev => prev + 1);
        } else {
          // No match - Enemy attacks! Reset combo
          setCombo(0);
          playMismatch();
          
          setMistakes(prev => prev + 1);
          playEnemyAttack();
          setEnemyAttacking(true);
          setTimeout(() => {
            setEnemyAttacking(false);
            playPlayerHit();
            setPlayerHit(true);
            setTimeout(() => setPlayerHit(false), 300);
          }, 200);

          setCards(prev => prev.map(c => 
            c.id === firstId || c.id === secondId 
              ? { ...c, isFlipped: false } 
              : c
          ));
          setPlayerHp(prev => Math.max(0, prev - levelConfig.enemyDamage));
        }
        setFlippedCards([]);
        setIsChecking(false);
      }, 800);
    }
  };

  // Check for victory/defeat
  useEffect(() => {
    if (gameState !== 'playing') return;

    if (playerHp <= 0) {
      playDefeat();
      setGameState('defeat');
    } else if (enemyHp <= 0) {
      playVictory();
      setGameState('victory');
      // Auto-advance after 2 seconds
      setTimeout(() => {
        startNextLevel();
      }, 2000);
    }
  }, [playerHp, enemyHp, gameState, startNextLevel]);

  // Get health bar class based on HP percentage
  const getHealthClass = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage <= 25) return 'low';
    if (percentage <= 50) return 'mid';
    return '';
  };

  // Get grid columns based on number of cards
  const getGridCols = (cardCount: number) => {
    if (cardCount <= 4) return 'grid-cols-2';
    if (cardCount <= 6) return 'grid-cols-3';
    if (cardCount <= 8) return 'grid-cols-4';
    if (cardCount <= 12) return 'grid-cols-4 md:grid-cols-6';
    return 'grid-cols-4 md:grid-cols-8';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Start Screen */}
      {gameState === 'start' && (
        <div className="game-overlay">
          <div className="text-center space-y-8 max-w-lg mx-auto px-4">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-display font-black text-foreground uppercase tracking-wider">
                Battle Card
              </h1>
              <h2 className="text-2xl md:text-4xl font-display font-bold text-primary uppercase">
                Matcher
              </h2>
            </div>
            
            <div className="flex justify-center gap-8 text-6xl md:text-8xl animate-float">
              <span className="player-sprite">🥷</span>
              <Swords className="w-12 h-12 md:w-16 md:h-16 text-accent self-center" />
              <span className="enemy-sprite">🐲</span>
            </div>

            <p className="text-muted-foreground text-lg md:text-xl max-w-md mx-auto font-body">
              Match the cards to attack! Wrong matches hurt you!
            </p>
            
            <div className="flex flex-col gap-4">
              <button onClick={startGame} className="btn-battle">
                <Play className="inline-block w-6 h-6 mr-2" />
                New Game
              </button>
              
              <button onClick={openLevelSelect} className="btn-secondary">
                <Zap className="inline-block w-5 h-5 mr-2" />
                Select Level
              </button>
            </div>

            {/* High Scores */}
            {highScores.length > 0 && (
              <div className="mt-8 p-4 rounded-xl bg-card/50 border border-border/50">
                <h3 className="font-display text-lg text-accent uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Best Runs
                </h3>
                <div className="space-y-2">
                  {highScores.slice(0, 3).map((score, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm font-body px-3 py-2 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-display font-bold ${index === 0 ? 'text-accent' : 'text-muted-foreground'}`}>
                          #{index + 1}
                        </span>
                        <span className="text-foreground/80">{score.date}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {formatTime(score.time)}
                        </span>
                        <span className="flex items-center gap-1 text-destructive/80">
                          <X className="w-4 h-4" />
                          {score.mistakes}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Level Select Screen */}
      {gameState === 'levelSelect' && (
        <div className="game-overlay">
          <div className="text-center space-y-6 max-w-2xl mx-auto px-4">
            <button 
              onClick={goToMenu}
              className="absolute top-6 left-6 btn-icon"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <h2 className="text-3xl md:text-4xl font-display font-black text-foreground uppercase tracking-wider">
              Select Level
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {LEVELS.map((level, index) => {
                const isUnlocked = index + 1 <= unlockedLevels;
                return (
                  <button
                    key={level.level}
                    onClick={() => isUnlocked && startLevel(index)}
                    disabled={!isUnlocked}
                    className={`level-select-card ${isUnlocked ? '' : 'locked'} ${level.enemy.color}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl md:text-5xl">
                        {isUnlocked ? level.enemy.emoji : '🔒'}
                      </span>
                      <div className="text-left flex-1">
                        <h3 className="font-display font-bold text-lg uppercase">
                          Level {level.level}: {level.name}
                        </h3>
                        <p className="text-sm opacity-80 font-body">
                          {isUnlocked ? (
                            <>
                              <span className="text-foreground/90">{level.enemy.name}</span>
                              <span className="mx-2">•</span>
                              <span>{level.pairs} pairs</span>
                            </>
                          ) : (
                            'Complete previous level to unlock'
                          )}
                        </p>
                        {isUnlocked && (
                          <p className="text-xs opacity-60 font-body mt-1">
                            {level.enemy.abilityDescription}
                          </p>
                        )}
                      </div>
                      {!isUnlocked && (
                        <Lock className="w-5 h-5 opacity-50" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Victory Overlay */}
      {gameState === 'victory' && (
        <div className="game-overlay">
          <div className="text-center space-y-6">
            <Trophy className="w-20 h-20 md:w-28 md:h-28 text-success mx-auto animate-float" />
            <h2 className="victory-text">Victory!</h2>
            <p className="text-muted-foreground text-xl font-body">
              Level {currentLevel + 1} Complete
            </p>
            <p className="text-foreground/60 text-lg font-body">
              Next level starting...
            </p>
          </div>
        </div>
      )}

      {/* Defeat Overlay */}
      {gameState === 'defeat' && (
        <div className="game-overlay">
          <div className="text-center space-y-6">
            <Shield className="w-20 h-20 md:w-28 md:h-28 text-destructive mx-auto opacity-50" />
            <h2 className="defeat-text">Defeated!</h2>
            <p className="text-muted-foreground text-xl font-body">
              {levelConfig.enemy.name} defeated you at Level {currentLevel + 1}
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => startLevel(currentLevel)} className="btn-battle">
                <RotateCcw className="inline-block w-6 h-6 mr-2" />
                Retry Level
              </button>
              <button onClick={goToMenu} className="btn-secondary">
                <Home className="inline-block w-5 h-5 mr-2" />
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Champion Overlay */}
      {gameState === 'champion' && (
        <div className="game-overlay">
          <div className="text-center space-y-6 max-w-lg mx-auto px-4">
            <div className="text-8xl md:text-9xl animate-float">👑</div>
            <h2 className="champion-text">Champion!</h2>
            
            {isNewHighScore && (
              <div className="flex items-center justify-center gap-2 text-accent font-display text-xl animate-float">
                <Star className="w-6 h-6 fill-accent" />
                New Best Score!
                <Star className="w-6 h-6 fill-accent" />
              </div>
            )}
            
            <p className="text-accent text-xl font-body">
              You conquered all 5 levels!
            </p>

            {/* Final Stats */}
            <div className="flex justify-center gap-8 p-4 rounded-xl bg-card/50 border border-accent/30">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-5 h-5" />
                  <span className="font-body text-sm uppercase">Time</span>
                </div>
                <span className="font-display text-2xl text-foreground">{formatTime(elapsedTime)}</span>
              </div>
              <div className="w-px bg-border/50" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <X className="w-5 h-5" />
                  <span className="font-body text-sm uppercase">Mistakes</span>
                </div>
                <span className="font-display text-2xl text-foreground">{mistakes}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={startGame} className="btn-battle">
                <Zap className="inline-block w-6 h-6 mr-2" />
                Play Again
              </button>
              <button onClick={goToMenu} className="btn-secondary">
                <Home className="inline-block w-5 h-5 mr-2" />
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Arena */}
      {gameState === 'playing' && (
        <>
          {/* Header with Level & Health Bars */}
          <header className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <button onClick={goToMenu} className="btn-icon">
                <Home className="w-5 h-5" />
              </button>
              
              <div className="level-badge flex items-center gap-3">
                <span className="text-xl">{levelConfig.enemy.emoji}</span>
                Level {levelConfig.level}: {levelConfig.name}
              </div>
              
              <button onClick={() => startLevel(currentLevel)} className="btn-icon">
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-4 md:gap-8 max-w-4xl mx-auto">
              {/* Player Health */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  <span className="font-display text-sm text-foreground/80 uppercase">You</span>
                  <span className="font-body text-sm text-muted-foreground ml-auto">
                    {playerHp}/{maxPlayerHp}
                  </span>
                </div>
                <div className="health-bar-container">
                  <div 
                    className={`health-bar-fill ${getHealthClass(playerHp, maxPlayerHp)}`}
                    style={{ width: `${(playerHp / maxPlayerHp) * 100}%` }}
                  />
                </div>
              </div>

              <Swords className="w-8 h-8 text-accent shrink-0" />

              {/* Enemy Health */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-body text-sm text-muted-foreground">
                    {enemyHp}/{levelConfig.enemyHp}
                  </span>
                  <span className="font-display text-sm text-foreground/80 uppercase ml-auto">{levelConfig.enemy.name}</span>
                  <Heart className="w-5 h-5 text-secondary" />
                </div>
                <div className="health-bar-container">
                  <div 
                    className={`health-bar-fill ${getHealthClass(enemyHp, levelConfig.enemyHp)}`}
                    style={{ width: `${(enemyHp / levelConfig.enemyHp) * 100}%`, marginLeft: 'auto' }}
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Battle Area */}
          <main className="flex-1 flex items-center justify-center p-4 gap-4 md:gap-8 relative">
            {/* Combo Indicator */}
            {showCombo && combo >= 2 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 animate-combo-pop">
                <div className="combo-badge">
                  <Flame className="w-5 h-5" />
                  <span>{combo}x Combo!</span>
                  {lastDamage > levelConfig.playerDamage && (
                    <span className="text-xs opacity-80">+{lastDamage - levelConfig.playerDamage} dmg</span>
                  )}
                </div>
              </div>
            )}

            {/* Player */}
            <div className="character">
              <div 
                className={`character-sprite player-sprite ${playerAttacking ? 'player-attack' : ''} ${playerHit ? 'character-hit' : ''}`}
              >
                🥷
              </div>
              <span className="font-display text-xs md:text-sm text-primary/80 mt-2 uppercase">Player</span>
            </div>

            {/* Cards Grid */}
            <div className="flex-1 max-w-2xl">
              <div className={`grid ${getGridCols(cards.length)} gap-2 md:gap-3`}>
                {cards.map(card => (
                  <div
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    className={`game-card aspect-[3/4] ${card.isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
                  >
                    <div className="game-card-inner">
                      <div className="game-card-face game-card-back">
                        <div className="card-back-pattern" />
                      </div>
                      <div className="game-card-face game-card-front flex-col gap-1 p-2">
                        {getCardImage(card.word) ? (
                          <img 
                            src={getCardImage(card.word)} 
                            alt={card.word}
                            className="w-full h-3/4 object-contain drop-shadow-lg"
                          />
                        ) : null}
                        <span className="text-xs md:text-sm font-display uppercase tracking-wider">
                          {card.word}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enemy */}
            <div className="character">
              <div 
                className={`character-sprite ${levelConfig.enemy.color} ${enemyAttacking ? 'enemy-attack' : ''} ${enemyHit ? 'character-hit' : ''}`}
              >
                {levelConfig.enemy.emoji}
              </div>
              <span className="font-display text-xs md:text-sm text-secondary/80 mt-2 uppercase">
                {levelConfig.enemy.name}
              </span>
            </div>
          </main>

          {/* Footer */}
          <footer className="p-4">
            <div className="flex items-center justify-center gap-6 text-sm font-body">
              <span className="text-muted-foreground">
                Pairs: {matchedPairs} / {levelConfig.pairs}
              </span>
              {combo >= 2 && (
                <span className="flex items-center gap-1 text-accent font-display">
                  <Flame className="w-4 h-4" />
                  {combo}x
                </span>
              )}
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                {formatTime(elapsedTime)}
              </span>
              <span className="flex items-center gap-1 text-destructive/70">
                <X className="w-4 h-4" />
                {mistakes}
              </span>
            </div>
          </footer>
        </>
      )}
    </div>
  );
};

export default BattleCardMatcher;
