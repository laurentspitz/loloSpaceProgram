import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'pathfinder',
    year: 1997,
    month: 6, // July

    title: 'mission.pathfinder.title',
    description: 'mission.pathfinder.description',
    flavorText: 'mission.pathfinder.flavorText',

    type: 'event',
    country: 'USA',
    agency: 'nasa',

    unlockedParts: ['Rover Wheels', 'Airbag Landing System']
};

export const locales = { en, fr };
export default config;
