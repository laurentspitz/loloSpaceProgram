import type { MissionConfig } from '../../types';
import { isInOrbit } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'sts1',
    year: 1981,
    month: 3, // April

    title: 'mission.sts1.title',
    description: 'mission.sts1.description',
    flavorText: 'mission.sts1.flavorText',

    type: 'objective',
    country: 'USA',
    agency: 'nasa',

    conditionLabel: 'mission.sts1.conditionLabel',
    checkCondition: (rocket, bodies) => isInOrbit(rocket, bodies, 300000, 3000),

    rewardMoney: 10000,
    unlockedParts: ['Shuttle Orbiter', 'SRB']
};

export const locales = { en, fr };
export default config;
