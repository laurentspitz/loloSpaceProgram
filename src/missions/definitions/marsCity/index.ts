import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'marsCity',
    year: 2050,
    month: 0, // January

    title: 'mission.marsCity.title',
    description: 'mission.marsCity.description',
    flavorText: 'mission.marsCity.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Nuclear Reactor', 'Terraforming Unit']
};

export const locales = { en, fr };
export default config;
