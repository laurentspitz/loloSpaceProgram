import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'voyager1',
    year: 1977,
    month: 8, // September

    title: 'mission.voyager1.title',
    description: 'mission.voyager1.description',
    flavorText: 'mission.voyager1.flavorText',

    type: 'objective',
    country: 'USA',
    agency: 'nasa',

    conditionLabel: 'mission.voyager1.conditionLabel',
    checkCondition: (rocket, _bodies) => rocket.body.velocity.mag() > 40000,

    rewardMoney: 10000,
    unlockedParts: ['RTG Power Source', 'High-Gain Antenna']
};

export const locales = { en, fr };
export default config;
