import i18next from 'i18next';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

// Read saved language preference from localStorage
function getSavedLanguage(): string {
    try {
        const settings = localStorage.getItem('user_settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            if (parsed.language && ['en', 'fr'].includes(parsed.language)) {
                return parsed.language;
            }
        }
    } catch (e) {
        console.warn('Failed to read language preference:', e);
    }
    return 'en'; // Default to English
}

i18next.init({
    lng: getSavedLanguage(),
    debug: false,
    resources: {
        en: {
            translation: en
        },
        fr: {
            translation: fr
        }
    }
});

export default i18next;
