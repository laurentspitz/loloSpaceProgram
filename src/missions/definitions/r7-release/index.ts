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
        'sputnik_1',
        'engine_rd108',
        'tank_block_a',
        'booster-r7-block-b-right',
        'booster-r7-block-b-left',
        'engine_rd0110',
        'tank_block_e',
        'control_r7_sas',
        'fairing-generic'
    ]
};

export const locales = { en, fr };
export default config;
