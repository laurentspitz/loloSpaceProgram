import type { MissionConfig } from '../../types';
import { isInOrbit } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'salyut1',
    year: 1971,
    month: 3, // April

    title: 'mission.salyut1.title',
    description: 'mission.salyut1.description',
    flavorText: 'mission.salyut1.flavorText',

    type: 'objective',
    country: 'USSR',

    conditionLabel: 'mission.salyut1.conditionLabel',
    checkCondition: (rocket, bodies) => isInOrbit(rocket, bodies, 250000, 2500),

    rewardMoney: 10000,
    unlockedParts: ['Station Module']
};

export const locales = { en, fr };
export default config;
