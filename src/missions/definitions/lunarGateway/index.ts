import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'lunarGateway',
    year: 2028,
    month: 0, // January

    title: 'mission.lunarGateway.title',
    description: 'mission.lunarGateway.description',
    flavorText: 'mission.lunarGateway.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['HALO Module', 'PPE Module']
};

export const locales = { en, fr };
export default config;
