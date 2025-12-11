import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'interstellarProbe',
    year: 2085,
    month: 0, // January

    title: 'mission.interstellarProbe.title',
    description: 'mission.interstellarProbe.description',
    flavorText: 'mission.interstellarProbe.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Laser Sail', 'Hibernation Pod']
};

export const locales = { en, fr };
export default config;
