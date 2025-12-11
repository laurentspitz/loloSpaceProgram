import type { MissionConfig } from '../../types';
import { isLandedOnBody } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'apollo11',
    year: 1969,
    month: 6, // July

    title: 'mission.apollo11.title',
    description: 'mission.apollo11.description',
    flavorText: 'mission.apollo11.flavorText',

    type: 'objective',
    country: 'USA',
    agency: 'nasa',

    conditionLabel: 'mission.apollo11.conditionLabel',
    checkCondition: (rocket, bodies) => isLandedOnBody(rocket, bodies, 'Moon'),

    rewardMoney: 10000,
    unlockedParts: ['Lunar Module', 'Moon Rover']
};

export const locales = { en, fr };
export default config;
