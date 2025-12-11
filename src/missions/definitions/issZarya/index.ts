import type { MissionConfig } from '../../types';
import { isInOrbit } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'issZarya',
    year: 1998,
    month: 10, // November

    title: 'mission.issZarya.title',
    description: 'mission.issZarya.description',
    flavorText: 'mission.issZarya.flavorText',

    type: 'objective',
    country: 'International',

    conditionLabel: 'mission.issZarya.conditionLabel',
    checkCondition: (rocket, bodies) => isInOrbit(rocket, bodies, 400000, 3000),

    rewardMoney: 10000,
    unlockedParts: ['Zarya Module', 'Cupola']
};

export const locales = { en, fr };
export default config;
