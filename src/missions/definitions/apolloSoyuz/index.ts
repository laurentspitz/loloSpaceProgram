import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'apolloSoyuz',
    year: 1975,
    month: 6, // July

    title: 'mission.apolloSoyuz.title',
    description: 'mission.apolloSoyuz.description',
    flavorText: 'mission.apolloSoyuz.flavorText',

    type: 'event',
    country: ['USA', 'USSR'],
    agency: ['nasa', 'okb1'],

    unlockedParts: ['Universal Docking Adapter']
};

export const locales = { en, fr };
export default config;
