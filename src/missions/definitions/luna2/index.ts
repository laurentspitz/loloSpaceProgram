import type { MissionConfig } from '../../types';
import { isNearBody } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'luna2',
    year: 1959,
    month: 8, // September

    title: 'mission.luna2.title',
    description: 'mission.luna2.description',
    flavorText: 'mission.luna2.flavorText',

    type: 'objective',
    country: 'USSR',
    agency: 'okb1',

    conditionLabel: 'mission.luna2.conditionLabel',
    checkCondition: (rocket, bodies) => isNearBody(rocket, bodies, 'Moon', 5000),

    rewardMoney: 10000,
    unlockedParts: ['Guidance Computer V1']
};

export const locales = { en, fr };
export default config;
