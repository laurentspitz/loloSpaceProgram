import i18next from 'i18next';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

i18next.init({
    lng: 'en', // default language
    debug: true,
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
