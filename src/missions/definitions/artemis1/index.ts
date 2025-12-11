import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'artemis1',
    year: 2022,
    month: 10, // November

    title: 'mission.artemis1.title',
    description: 'mission.artemis1.description',
    flavorText: 'mission.artemis1.flavorText',

    type: 'event',
    country: ['USA', 'Europe'],
    agency: ['nasa', 'esa'],

    unlockedParts: ['Orion Capsule', 'SLS Core Stage']
};

export const locales = { en, fr };
export default config;
