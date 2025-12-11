import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'asteroidMining',
    year: 2055,
    month: 0, // January

    title: 'mission.asteroidMining.title',
    description: 'mission.asteroidMining.description',
    flavorText: 'mission.asteroidMining.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Mining Laser', 'Ore Processor']
};

export const locales = { en, fr };
export default config;
