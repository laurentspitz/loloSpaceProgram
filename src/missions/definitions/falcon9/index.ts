import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'falcon9',
    year: 2015,
    month: 11, // December

    title: 'mission.falcon9.title',
    description: 'mission.falcon9.description',
    flavorText: 'mission.falcon9.flavorText',

    type: 'event',
    country: 'USA (SpaceX)',

    unlockedParts: ['Landing Legs (Heavy)', 'Grid Fins']
};

export const locales = { en, fr };
export default config;
