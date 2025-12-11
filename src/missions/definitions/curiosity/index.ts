import type { MissionConfig } from '../../types';
import { isLandedOnBody } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'curiosity',
    year: 2012,
    month: 7, // August

    title: 'mission.curiosity.title',
    description: 'mission.curiosity.description',
    flavorText: 'mission.curiosity.flavorText',

    type: 'objective',
    country: 'USA',

    conditionLabel: 'mission.curiosity.conditionLabel',
    checkCondition: (rocket, bodies) => isLandedOnBody(rocket, bodies, 'Mars'),

    rewardMoney: 10000,
    unlockedParts: ['Sky Crane', 'Mars Rover']
};

export const locales = { en, fr };
export default config;
