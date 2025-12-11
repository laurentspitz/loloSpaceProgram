import type { MissionConfig } from '../../types';
import { isInOrbit } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'hubble',
    year: 1990,
    month: 3, // April

    title: 'mission.hubble.title',
    description: 'mission.hubble.description',
    flavorText: 'mission.hubble.flavorText',

    type: 'objective',
    country: 'USA',

    conditionLabel: 'mission.hubble.conditionLabel',
    checkCondition: (rocket, bodies) => isInOrbit(rocket, bodies, 500000, 3500),

    rewardMoney: 10000,
    unlockedParts: ['Space Telescope', 'Solar Panels XL']
};

export const locales = { en, fr };
export default config;
