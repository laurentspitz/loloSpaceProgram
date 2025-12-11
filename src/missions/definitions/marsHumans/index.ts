import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'marsHumans',
    year: 2035,
    month: 0, // January

    title: 'mission.marsHumans.title',
    description: 'mission.marsHumans.description',
    flavorText: 'mission.marsHumans.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Mars Habitat', 'ISRU Fuel Converter']
};

export const locales = { en, fr };
export default config;
