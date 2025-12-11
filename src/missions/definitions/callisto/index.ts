import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'callisto',
    year: 2065,
    month: 0, // January

    title: 'mission.callisto.title',
    description: 'mission.callisto.description',
    flavorText: 'mission.callisto.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Jupiter Radiation Shield']
};

export const locales = { en, fr };
export default config;
