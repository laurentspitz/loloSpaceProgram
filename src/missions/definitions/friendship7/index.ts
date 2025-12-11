import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'friendship7',
    year: 1962,
    month: 1, // February

    title: 'mission.friendship7.title',
    description: 'mission.friendship7.description',
    flavorText: 'mission.friendship7.flavorText',

    type: 'event',
    country: 'USA',

    unlockedParts: ['Heat Shield (1.25m)']
};

export const locales = { en, fr };
export default config;
