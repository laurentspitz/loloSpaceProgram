/**
 * Utility functions for the Chronology timeline
 */

/**
 * Get the color for a timeline node based on its status
 */
export function getNodeColor(type: string): string {
    switch (type) {
        case 'success': return '#00C851';
        case 'failure': return '#ff4444';
        case 'discovery': return '#33b5e5';
        case 'future': return '#aa66cc';
        case 'mixed': return '#FF8800';
        default: return '#fff';
    }
}

/**
 * Get the flag emoji for a country
 */
export function getFlag(country: string): string {
    if (country.includes('USA')) return '🇺🇸';
    if (country.includes('USSR')) return '☭';
    if (country.includes('China')) return '🇨🇳';
    if (country.includes('ESA') || country.includes('Europe')) return '🇪🇺';
    if (country.includes('International')) return '🌍';
    return '🏳️';
}
