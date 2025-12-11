import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'explorer1',
    year: 1958,
    month: 0, // January

    title: 'mission.explorer1.title',
    description: 'mission.explorer1.description',
    flavorText: 'mission.explorer1.flavorText',

    type: 'event',
    country: 'USA',
    agency: 'nasa',

    unlockedParts: ['Scientific Instruments']
};

export const locales = { en, fr };
export default config;
