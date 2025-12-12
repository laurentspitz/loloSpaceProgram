import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

import img from './blueprint.jpg';

const config: MissionConfig = {
    id: 'r7_release',
    year: 1957,
    month: 9, // October

    title: 'mission.r7_release.title',
    description: 'mission.r7_release.description',
    flavorText: 'mission.r7_release.flavorText',

    type: 'event',
    country: 'USSR',
    agency: 'okb1',
    image: img,

    unlockedParts: [
        'Sputnik 1',
        'RD-108 Engine',
        'R7 Block A',
        'R7 Block B (Right)',
        'R7 Block B (Left)',
        'RD-0110 Engine',
        'R7 Block E',
        'Generic Fairing'
    ]
};

export const locales = { en, fr };
export default config;
