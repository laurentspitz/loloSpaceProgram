import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'artemis3',
    year: 2026,
    month: 0, // January

    title: 'mission.artemis3.title',
    description: 'mission.artemis3.description',
    flavorText: 'mission.artemis3.flavorText',

    type: 'event',
    country: 'USA',
    agency: ['nasa', 'spacex'],

    unlockedParts: ['Starship HLS', 'Lunar EVA Suit']
};

export const locales = { en, fr };
export default config;
