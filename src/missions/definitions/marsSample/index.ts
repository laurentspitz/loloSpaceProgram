import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'marsSample',
    year: 2030,
    month: 0, // January

    title: 'mission.marsSample.title',
    description: 'mission.marsSample.description',
    flavorText: 'mission.marsSample.flavorText',

    type: 'event',
    country: 'USA/ESA',

    unlockedParts: ['Sample Return Capsule', 'Mars Ascent Vehicle']
};

export const locales = { en, fr };
export default config;
