import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'challenger',
    year: 1986,
    month: 0, // January

    title: 'mission.challenger.title',
    description: 'mission.challenger.description',

    type: 'event',
    country: 'USA'
};

export const locales = { en, fr };
export default config;
