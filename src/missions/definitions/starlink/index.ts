import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'starlink',
    year: 2019,
    month: 4, // May

    title: 'mission.starlink.title',
    description: 'mission.starlink.description',
    flavorText: 'mission.starlink.flavorText',

    type: 'event',
    country: 'USA',
    agency: 'spacex',

    unlockedParts: ['Phased Array Antenna', 'Krypton Ion Thruster']
};

export const locales = { en, fr };
export default config;
