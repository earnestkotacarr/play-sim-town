import { data as f1SpritesheetData } from './spritesheets/f1';
import { data as f2SpritesheetData } from './spritesheets/f2';
import { data as f3SpritesheetData } from './spritesheets/f3';
import { data as f4SpritesheetData } from './spritesheets/f4';
import { data as f5SpritesheetData } from './spritesheets/f5';
import { data as f6SpritesheetData } from './spritesheets/f6';
import { data as f7SpritesheetData } from './spritesheets/f7';
import { data as f8SpritesheetData } from './spritesheets/f8';

// play-sim-town: ants (survival first) and grasshoppers (play first) share one town.
// `kind` is read by convex/aiTown/ecology.ts; identity/plan go to the LLM.
// Only 8 sprites exist (f1-f8), so looks repeat; the name says which kind an agent is.
const ANT_IDENTITY = `You are an ant. Survival comes first: you go to the bar only when you have plenty of food saved, and you leave as soon as you get hungry to go and gather sugar on the hills. You are careful and a little worried about the winter, but you do like company.`;
const GRASSHOPPER_IDENTITY = `You are a grasshopper. Play comes first: you love the bar, the music and the talk, and you go whenever you are not short of food and stay until you are nearly starving. You think life is for enjoying, and you trust that friends will help if things get bad.`;
const ANTS = ["Aki", "Mina", "Taro", "Hana", "Ken", "Yui", "Sora", "Riku", "Emi", "Jun", "Nao", "Kai", "Rin", "Sho", "Mio"];
const GRASSHOPPERS = ["Gus", "Kiki", "Lulu", "Zed", "Bo", "Fifi", "Pip", "Tito", "Juju", "Max", "Coco", "Dot", "Remy", "Suki", "Fizz"];

export const Descriptions = ANTS.flatMap((a, i) => [
  {
    name: `Ant ${a}`,
    character: `f${(2 * i) % 8 + 1}`,
    kind: 'ant',
    identity: `Ant ${a} is the name you go by. ${ANT_IDENTITY}`,
    plan: 'You want to get through the winter, and to have a friend or two.',
  },
  {
    name: `Grasshopper ${GRASSHOPPERS[i]}`,
    character: `f${(2 * i + 1) % 8 + 1}`,
    kind: 'grasshopper',
    identity: `Grasshopper ${GRASSHOPPERS[i]} is the name you go by. ${GRASSHOPPER_IDENTITY}`,
    plan: 'You want to have fun at the bar and make friends.',
  },
]);

export const characters = [
  {
    name: 'f1',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f1SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f2',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f2SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f3',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f3SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f4',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f4SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f5',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f5SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f6',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f6SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f7',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f7SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f8',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f8SpritesheetData,
    speed: 0.1,
  },
];

// Characters move at 0.75 tiles per second.
// Movement speed, in tiles per second. play-sim-town: much faster than AI Town's 0.75.
export const movementSpeed = 2.5; // AI agents
export const humanMovementSpeed = 6; // human players (arrow keys / click)
