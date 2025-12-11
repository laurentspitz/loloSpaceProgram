import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'starshipOrbital',
    year: 2024,
    month: 2, // March

    title: 'mission.starshipOrbital.title',
    description: 'mission.starshipOrbital.description',
    flavorText: 'mission.starshipOrbital.flavorText',

    type: 'event',
    country: 'USA (SpaceX)',
    agency: 'spacex',

    unlockedParts: ['Raptor Engine', 'Starship Hull']
};

export const locales = { en, fr };
export default config;
