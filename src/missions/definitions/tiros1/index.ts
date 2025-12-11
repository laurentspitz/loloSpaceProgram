import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'tiros1',
    year: 1960,
    month: 3, // April

    title: 'mission.tiros1.title',
    description: 'mission.tiros1.description',
    flavorText: 'mission.tiros1.flavorText',

    type: 'event',
    country: 'USA',

    unlockedParts: ['Weather Sensors', 'Solar Panel (Small)']
};

export const locales = { en, fr };
export default config;
