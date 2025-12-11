import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'luna9',
    year: 1966,
    month: 1, // February

    title: 'mission.luna9.title',
    description: 'mission.luna9.description',
    flavorText: 'mission.luna9.flavorText',

    type: 'event',
    country: 'USSR',

    unlockedParts: ['Landing Legs (Light)']
};

export const locales = { en, fr };
export default config;
