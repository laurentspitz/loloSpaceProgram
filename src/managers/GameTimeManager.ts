export class GameTimeManager {
    static readonly START_DATE = new Date('1957-01-01T00:00:00Z');

    /**
     * Calculate current date based on elapsed game seconds
     * @param elapsedSeconds Total seconds passed in game
     */
    static getDate(elapsedSeconds: number): Date {
        return new Date(this.START_DATE.getTime() + elapsedSeconds * 1000);
    }

    /**
     * Get the current year based on elapsed game seconds
     */
    static getYear(elapsedSeconds: number): number {
        return this.getDate(elapsedSeconds).getUTCFullYear();
    }

    /**
     * Get elapsed seconds corresponding to the start of a specific year
     */
    static getSecondsFromYear(year: number): number {
        const targetDate = new Date(`${year}-01-01T00:00:00Z`);
        const diffMs = targetDate.getTime() - this.START_DATE.getTime();
        return Math.max(0, diffMs / 1000);
    }
}
