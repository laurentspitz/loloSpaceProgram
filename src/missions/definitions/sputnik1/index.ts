import type { MissionConfig } from '../../types';
import { isInOrbit } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'sputnik1',
    year: 1957,
    month: 9,  // October

    title: 'mission.sputnik1.title',
    description: 'mission.sputnik1.description',
    flavorText: 'mission.sputnik1.flavor',
    conditionLabel: 'mission.sputnik1.conditionLabel',

    type: 'objective',
    country: 'USSR',
    agency: 'okb1',

    checkCondition: (rocket, bodies) => isInOrbit(rocket, bodies, 150000, 2000),

    rewardMoney: 10000,
    unlockedParts: ['LV-T30 Engine', 'X200 Fuel Tank']
};

export const locales = { en, fr };
export default config;
