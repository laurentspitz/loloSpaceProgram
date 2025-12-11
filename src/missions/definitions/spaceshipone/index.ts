import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'spaceshipone',
    year: 2004,
    month: 9, // October

    title: 'mission.spaceshipone.title',
    description: 'mission.spaceshipone.description',
    flavorText: 'mission.spaceshipone.flavorText',

    type: 'event',
    country: 'USA (Private)',

    unlockedParts: ['Hybrid Rocket Motor']
};

export const locales = { en, fr };
export default config;
