// Card images mapping
import punchImg from '@/assets/cards/punch.png';
import kickImg from '@/assets/cards/kick.png';
import swordImg from '@/assets/cards/sword.png';
import bowImg from '@/assets/cards/bow.png';
import axeImg from '@/assets/cards/axe.png';
import fireImg from '@/assets/cards/fire.png';
import iceImg from '@/assets/cards/ice.png';
import darkImg from '@/assets/cards/dark.png';
import lightImg from '@/assets/cards/light.png';
import thunderImg from '@/assets/cards/thunder.png';
import windImg from '@/assets/cards/wind.png';
import earthImg from '@/assets/cards/earth.png';
import waterImg from '@/assets/cards/water.png';
import shadowImg from '@/assets/cards/shadow.png';
import holyImg from '@/assets/cards/holy.png';
import dragonImg from '@/assets/cards/dragon.png';
import phoenixImg from '@/assets/cards/phoenix.png';
import titanImg from '@/assets/cards/titan.png';
import demonImg from '@/assets/cards/demon.png';
import angelImg from '@/assets/cards/angel.png';
import reaperImg from '@/assets/cards/reaper.png';
import stormImg from '@/assets/cards/storm.png';
import chaosImg from '@/assets/cards/chaos.png';

export const cardImages: Record<string, string> = {
  Punch: punchImg,
  Kick: kickImg,
  Sword: swordImg,
  Bow: bowImg,
  Axe: axeImg,
  Fire: fireImg,
  Ice: iceImg,
  Dark: darkImg,
  Light: lightImg,
  Thunder: thunderImg,
  Wind: windImg,
  Earth: earthImg,
  Water: waterImg,
  Shadow: shadowImg,
  Holy: holyImg,
  Dragon: dragonImg,
  Phoenix: phoenixImg,
  Titan: titanImg,
  Demon: demonImg,
  Angel: angelImg,
  Reaper: reaperImg,
  Storm: stormImg,
  Chaos: chaosImg,
};

export const getCardImage = (word: string): string | undefined => {
  return cardImages[word];
};
