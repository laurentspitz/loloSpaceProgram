import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'saturnv',
    year: 1967,
    month: 10, // November

    title: 'mission.saturnv.title',
    description: 'mission.saturnv.description',
    flavorText: 'mission.saturnv.flavorText',

    type: 'event',
    country: 'USA',

    unlockedParts: ['Mainsail Engine', 'Rockomax Jumbo-64 Tank']
};

export const locales = { en, fr };
export default config;
