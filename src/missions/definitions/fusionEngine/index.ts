import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'fusionEngine',
    year: 2070,
    month: 0, // January

    title: 'mission.fusionEngine.title',
    description: 'mission.fusionEngine.description',
    flavorText: 'mission.fusionEngine.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Fusion Engine', 'Helium-3 Tank']
};

export const locales = { en, fr };
export default config;
