import type { MissionConfig } from '../../types';
import { isInOrbit } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'sputnik2',
    year: 1957,
    month: 10, // November

    title: 'mission.sputnik2.title',
    description: 'mission.sputnik2.description',
    flavorText: 'mission.sputnik2.flavorText',

    type: 'objective',
    country: 'USSR',
    agency: 'okb1',

    conditionLabel: 'mission.sputnik2.conditionLabel',
    checkCondition: (rocket, bodies) => isInOrbit(rocket, bodies, 150000, 2000),

    rewardMoney: 10000,
    unlockedParts: ['Mk1 Command Pod']
};

export const locales = { en, fr };
export default config;
