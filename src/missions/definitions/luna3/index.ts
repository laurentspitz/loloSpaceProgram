import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'luna3',
    year: 1959,
    month: 9, // October

    title: 'mission.luna3.title',
    description: 'mission.luna3.description',

    type: 'event',
    country: 'USSR',

    unlockedParts: ['Film Camera']
};

export const locales = { en, fr };
export default config;
