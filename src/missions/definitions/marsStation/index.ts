import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'marsStation',
    year: 2040,
    month: 0, // January

    title: 'mission.marsStation.title',
    description: 'mission.marsStation.description',
    flavorText: 'mission.marsStation.flavorText',

    type: 'event',
    country: 'International',

    unlockedParts: ['Cycler Station', 'Interplanetary Module']
};

export const locales = { en, fr };
export default config;
