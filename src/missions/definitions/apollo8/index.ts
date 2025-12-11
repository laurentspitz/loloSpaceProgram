import type { MissionConfig } from '../../types';
import { isInOrbitAroundBody } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'apollo8',
    year: 1968,
    month: 11, // December

    title: 'mission.apollo8.title',
    description: 'mission.apollo8.description',
    flavorText: 'mission.apollo8.flavorText',

    type: 'objective',
    country: 'USA',

    conditionLabel: 'mission.apollo8.conditionLabel',
    checkCondition: (rocket, bodies) => isInOrbitAroundBody(rocket, bodies, 'Moon', 200000, 500),

    rewardMoney: 10000,
    unlockedParts: ['Lunar Navigation Computer']
};

export const locales = { en, fr };
export default config;
