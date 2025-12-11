import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'lunarBase',
    year: 2032,
    month: 0, // January

    title: 'mission.lunarBase.title',
    description: 'mission.lunarBase.description',
    flavorText: 'mission.lunarBase.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Lunar Habitat', 'ISRU Water Extractor']
};

export const locales = { en, fr };
export default config;
