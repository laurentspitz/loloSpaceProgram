import type { MissionConfig } from '../../types';
import { isLandedOnBody } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'viking1',
    year: 1976,
    month: 6, // July

    title: 'mission.viking1.title',
    description: 'mission.viking1.description',
    flavorText: 'mission.viking1.flavorText',

    type: 'objective',
    country: 'USA',
    agency: 'nasa',

    conditionLabel: 'mission.viking1.conditionLabel',
    checkCondition: (rocket, bodies) => isLandedOnBody(rocket, bodies, 'Mars'),

    rewardMoney: 10000,
    unlockedParts: ['Mars Lander', 'Heat Shield']
};

export const locales = { en, fr };
export default config;
