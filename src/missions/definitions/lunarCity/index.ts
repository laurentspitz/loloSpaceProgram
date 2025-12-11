import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'lunarCity',
    year: 2045,
    month: 0, // January

    title: 'mission.lunarCity.title',
    description: 'mission.lunarCity.description',
    flavorText: 'mission.lunarCity.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Advanced ISRU', 'Mass Driver']
};

export const locales = { en, fr };
export default config;
