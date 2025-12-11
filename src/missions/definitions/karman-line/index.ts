import type { MissionConfig } from '../../types';
import { getAltitude } from '../../helpers';
import en from './locales/en.json';
import fr from './locales/fr.json';
import { GAME_START_YEAR } from '../../../config';

const config: MissionConfig = {
    id: 'karman_line',
    year: GAME_START_YEAR,
    month: 0,

    title: 'mission.karman_line.title',
    description: 'mission.karman_line.description',
    conditionLabel: 'mission.karman_line.conditionLabel',

    type: 'objective',
    country: 'ALL',

    checkCondition: (rocket, bodies) => getAltitude(rocket, bodies) >= 100000,

    rewardMoney: 5000,
    unlockedParts: ['Basic Fin']
};

export const locales = { en, fr };
export default config;
