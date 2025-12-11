import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'gemini4',
    year: 1965,
    month: 5, // June

    title: 'mission.gemini4.title',
    description: 'mission.gemini4.description',

    type: 'event',
    country: 'USA'
};

export const locales = { en, fr };
export default config;
