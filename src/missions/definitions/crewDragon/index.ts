import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'crewDragon',
    year: 2020,
    month: 4, // May

    title: 'mission.crewDragon.title',
    description: 'mission.crewDragon.description',
    flavorText: 'mission.crewDragon.flavorText',

    type: 'event',
    country: 'USA (SpaceX)',

    unlockedParts: ['Crew Dragon Pod', 'SuperDraco Engine']
};

export const locales = { en, fr };
export default config;
