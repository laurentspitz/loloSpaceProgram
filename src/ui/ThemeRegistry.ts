import type { CockpitTheme } from './types';

export class ThemeRegistry {
    private static themes: Map<string, CockpitTheme> = new Map();

    static register(theme: CockpitTheme) {
        if (this.themes.has(theme.id)) {
            console.warn(`[ThemeRegistry] Theme '${theme.id}' is already registered.`);
            return;
        }
        console.log(`[ThemeRegistry] Registered theme: ${theme.id}`);
        this.themes.set(theme.id, theme);
    }

    static get(id: string): CockpitTheme | undefined {
        return this.themes.get(id);
    }
}
