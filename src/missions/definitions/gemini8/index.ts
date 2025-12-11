import type { MissionConfig } from '../../types';
import { isInOrbit } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'gemini8',
    year: 1966,
    month: 2, // March

    title: 'mission.gemini8.title',
    description: 'mission.gemini8.description',
    flavorText: 'mission.gemini8.flavorText',

    type: 'objective',
    country: 'USA',

    conditionLabel: 'mission.gemini8.conditionLabel',
    checkCondition: (rocket, bodies) => isInOrbit(rocket, bodies, 300000, 3000),

    rewardMoney: 10000,
    unlockedParts: ['Docking Port']
};

export const locales = { en, fr };
export default config;
