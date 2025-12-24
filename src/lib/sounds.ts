// Sound effects using Web Audio API
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

interface SoundOptions {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  fadeOut?: boolean;
  frequencyEnd?: number;
}

const playTone = ({ 
  frequency, 
  duration, 
  type = 'sine', 
  volume = 0.3,
  fadeOut = true,
  frequencyEnd
}: SoundOptions) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  
  if (frequencyEnd) {
    oscillator.frequency.exponentialRampToValueAtTime(frequencyEnd, audioContext.currentTime + duration);
  }
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  
  if (fadeOut) {
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  }
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

// Card flip sound - quick click
export const playCardFlip = () => {
  playTone({ frequency: 800, duration: 0.05, type: 'square', volume: 0.15 });
};

// Match success - ascending chime
export const playMatch = (combo: number = 1) => {
  const baseFreq = 400 + (combo * 50);
  playTone({ frequency: baseFreq, duration: 0.1, type: 'sine', volume: 0.25 });
  setTimeout(() => {
    playTone({ frequency: baseFreq * 1.25, duration: 0.1, type: 'sine', volume: 0.25 });
  }, 80);
  setTimeout(() => {
    playTone({ frequency: baseFreq * 1.5, duration: 0.15, type: 'sine', volume: 0.25 });
  }, 160);
};

// Player attack - whoosh
export const playPlayerAttack = () => {
  playTone({ frequency: 200, duration: 0.2, type: 'sawtooth', volume: 0.2, frequencyEnd: 100 });
};

// Enemy hit - impact
export const playEnemyHit = () => {
  playTone({ frequency: 150, duration: 0.15, type: 'square', volume: 0.3 });
  playTone({ frequency: 80, duration: 0.2, type: 'sine', volume: 0.25 });
};

// No match - descending tone
export const playMismatch = () => {
  playTone({ frequency: 300, duration: 0.15, type: 'square', volume: 0.2, frequencyEnd: 150 });
};

// Enemy attack - aggressive sweep
export const playEnemyAttack = () => {
  playTone({ frequency: 100, duration: 0.25, type: 'sawtooth', volume: 0.25, frequencyEnd: 300 });
};

// Player hit - ouch
export const playPlayerHit = () => {
  playTone({ frequency: 200, duration: 0.1, type: 'square', volume: 0.3 });
  setTimeout(() => {
    playTone({ frequency: 100, duration: 0.2, type: 'sine', volume: 0.25 });
  }, 50);
};

// Victory fanfare
export const playVictory = () => {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone({ frequency: freq, duration: 0.2, type: 'sine', volume: 0.25 });
    }, i * 150);
  });
};

// Defeat sound
export const playDefeat = () => {
  const notes = [400, 350, 300, 200];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone({ frequency: freq, duration: 0.25, type: 'sawtooth', volume: 0.2 });
    }, i * 200);
  });
};

// Champion fanfare - epic version
export const playChampion = () => {
  const melody = [523, 659, 784, 659, 784, 1047];
  melody.forEach((freq, i) => {
    setTimeout(() => {
      playTone({ frequency: freq, duration: 0.25, type: 'sine', volume: 0.3 });
      playTone({ frequency: freq / 2, duration: 0.25, type: 'triangle', volume: 0.15 });
    }, i * 180);
  });
};

// Combo sound - intensity increases with combo
export const playCombo = (combo: number) => {
  if (combo < 2) return;
  const freq = 600 + (combo * 100);
  playTone({ frequency: freq, duration: 0.1, type: 'triangle', volume: 0.2 });
  playTone({ frequency: freq * 1.5, duration: 0.15, type: 'sine', volume: 0.15 });
};

// Level up sound
export const playLevelUp = () => {
  const notes = [400, 500, 600, 800];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone({ frequency: freq, duration: 0.15, type: 'sine', volume: 0.25 });
    }, i * 100);
  });
};

// Resume audio context (needed for browsers that suspend it)
export const resumeAudio = async () => {
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
};
