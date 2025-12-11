import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'skylab',
    year: 1973,
    month: 4, // May

    title: 'mission.skylab.title',
    description: 'mission.skylab.description',
    flavorText: 'mission.skylab.flavorText',

    type: 'event',
    country: 'USA',

    unlockedParts: ['Solar Panel (Large)', 'Station Core']
};

export const locales = { en, fr };
export default config;
