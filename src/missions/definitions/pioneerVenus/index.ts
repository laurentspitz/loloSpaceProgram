import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'pioneerVenus',
    year: 1978,
    month: 5, // June

    title: 'mission.pioneerVenus.title',
    description: 'mission.pioneerVenus.description',
    flavorText: 'mission.pioneerVenus.flavorText',

    type: 'event',
    country: 'USA',
    agency: 'nasa',

    unlockedParts: ['Atmospheric Probe']
};

export const locales = { en, fr };
export default config;
