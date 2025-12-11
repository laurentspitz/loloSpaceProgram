import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'jamesWebb',
    year: 2021,
    month: 11, // December

    title: 'mission.jamesWebb.title',
    description: 'mission.jamesWebb.description',
    flavorText: 'mission.jamesWebb.flavorText',

    type: 'event',
    country: 'USA/ESA/CSA',

    unlockedParts: ['Sunshield', 'Cryogenic Mirror']
};

export const locales = { en, fr };
export default config;
