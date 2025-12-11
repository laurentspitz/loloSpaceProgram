import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'dragonCargo',
    year: 2010,
    month: 11, // December

    title: 'mission.dragonCargo.title',
    description: 'mission.dragonCargo.description',
    flavorText: 'mission.dragonCargo.flavorText',

    type: 'event',
    country: 'USA (SpaceX)',

    unlockedParts: ['Cargo Dragon Pod', 'PICA-X Heat Shield']
};

export const locales = { en, fr };
export default config;
