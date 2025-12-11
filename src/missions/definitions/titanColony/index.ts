import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'titanColony',
    year: 2075,
    month: 0, // January

    title: 'mission.titanColony.title',
    description: 'mission.titanColony.description',
    flavorText: 'mission.titanColony.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Cryo-Habitat', 'Methane Harvester']
};

export const locales = { en, fr };
export default config;
