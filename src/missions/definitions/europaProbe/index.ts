import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'europaProbe',
    year: 2060,
    month: 0, // January

    title: 'mission.europaProbe.title',
    description: 'mission.europaProbe.description',
    flavorText: 'mission.europaProbe.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Radiation Vault', 'Ice Drill']
};

export const locales = { en, fr };
export default config;
