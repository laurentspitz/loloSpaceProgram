import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'freedom7',
    year: 1961,
    month: 4, // May

    title: 'mission.freedom7.title',
    description: 'mission.freedom7.description',
    flavorText: 'mission.freedom7.flavorText',

    type: 'event',
    country: 'USA',

    unlockedParts: ['Solid Fuel Booster']
};

export const locales = { en, fr };
export default config;
