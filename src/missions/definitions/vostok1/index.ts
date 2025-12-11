import type { MissionConfig } from '../../types';
import { isInOrbit } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'vostok1',
    year: 1961,
    month: 3, // April

    title: 'mission.vostok1.title',
    description: 'mission.vostok1.description',
    flavorText: 'mission.vostok1.flavorText',

    type: 'objective',
    country: 'USSR',

    conditionLabel: 'mission.vostok1.conditionLabel',
    checkCondition: (rocket, bodies) => isInOrbit(rocket, bodies, 200000, 2500),

    rewardMoney: 10000,
    unlockedParts: ['Crew Capsule']
};

export const locales = { en, fr };
export default config;
