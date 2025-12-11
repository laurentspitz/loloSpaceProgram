import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'mariner4',
    year: 1964,
    month: 10, // November

    title: 'mission.mariner4.title',
    description: 'mission.mariner4.description',
    flavorText: 'mission.mariner4.flavorText',

    type: 'objective',
    country: 'USA',
    agency: 'nasa',

    unlockedParts: ['High-Gain Antenna']
};

export const locales = { en, fr };
export default config;
