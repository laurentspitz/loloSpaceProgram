import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'dysonSwarm',
    year: 2090,
    month: 0, // January

    title: 'mission.dysonSwarm.title',
    description: 'mission.dysonSwarm.description',
    flavorText: 'mission.dysonSwarm.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Solar Collector Array']
};

export const locales = { en, fr };
export default config;
