import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'mir',
    year: 1986,
    month: 1, // February

    title: 'mission.mir.title',
    description: 'mission.mir.description',
    flavorText: 'mission.mir.flavorText',

    type: 'event',
    country: 'USSR',

    unlockedParts: ['Long-Term Habitat Module', 'Progress Cargo']
};

export const locales = { en, fr };
export default config;
