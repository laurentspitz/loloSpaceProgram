import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'falcon1',
    year: 2008,
    month: 8, // September

    title: 'mission.falcon1.title',
    description: 'mission.falcon1.description',
    flavorText: 'mission.falcon1.flavorText',

    type: 'event',
    country: 'USA (SpaceX)',

    unlockedParts: ['Merlin Engine', 'Falcon Fuel Tank']
};

export const locales = { en, fr };
export default config;
