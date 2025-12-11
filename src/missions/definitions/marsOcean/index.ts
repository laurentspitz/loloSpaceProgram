import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'marsOcean',
    year: 2080,
    month: 0, // January

    title: 'mission.marsOcean.title',
    description: 'mission.marsOcean.description',
    flavorText: 'mission.marsOcean.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Orbital Mirror']
};

export const locales = { en, fr };
export default config;
