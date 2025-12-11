import type { MissionConfig } from '../../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

const config: MissionConfig = {
    id: 'vostok6',
    year: 1963,
    month: 5, // June

    title: 'mission.vostok6.title',
    description: 'mission.vostok6.description',

    type: 'event',
    country: 'USSR'
};

export const locales = { en, fr };
export default config;
