import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'phobosStation',
    year: 2038,
    month: 0, // January

    title: 'mission.phobosStation.title',
    description: 'mission.phobosStation.description',
    flavorText: 'mission.phobosStation.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Low-G Anchor System']
};

export const locales = { en, fr };
export default config;
