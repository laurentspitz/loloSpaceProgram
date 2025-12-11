import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'galileo',
    year: 1989,
    month: 9, // October

    title: 'mission.galileo.title',
    description: 'mission.galileo.description',
    flavorText: 'mission.galileo.flavorText',

    type: 'event',
    country: 'USA',

    unlockedParts: ['Reinforced Solar Panels', 'Jupiter Probe']
};

export const locales = { en, fr };
export default config;
