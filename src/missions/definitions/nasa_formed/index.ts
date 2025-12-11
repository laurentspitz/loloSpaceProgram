import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'nasa_formed',
    year: 1958,
    month: 9, // October

    title: 'mission.nasa_formed.title',
    description: 'mission.nasa_formed.description',

    type: 'event',
    country: 'USA'
};

export const locales = { en, fr };
export default config;
