import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'voskhod2',
    year: 1965,
    month: 2, // March

    title: 'mission.voskhod2.title',
    description: 'mission.voskhod2.description',
    flavorText: 'mission.voskhod2.flavorText',

    type: 'event',
    country: 'USSR',
    agency: 'okb1',

    unlockedParts: ['RCS Thruster Block']
};

export const locales = { en, fr };
export default config;
