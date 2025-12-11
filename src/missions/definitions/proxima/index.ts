import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'proxima',
    year: 2100,
    month: 0, // January

    title: 'mission.proxima.title',
    description: 'mission.proxima.description',
    flavorText: 'mission.proxima.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Antimatter Engine', 'Generation Ship Module']
};

export const locales = { en, fr };
export default config;
