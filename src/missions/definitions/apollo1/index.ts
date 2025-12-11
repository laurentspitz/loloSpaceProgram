import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'apollo1',
    year: 1967,
    month: 0, // January

    title: 'mission.apollo1.title',
    description: 'mission.apollo1.description',
    flavorText: 'mission.apollo1.flavorText',

    type: 'event',
    country: 'USA'
};

export const locales = { en, fr };
export default config;
