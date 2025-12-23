import type { Rocket } from '../entities/Rocket';
import type { Body } from '../core/Body';

/**
 * Function type for mission condition checking
 * Returns true if the mission objective is met
 */
export type ConditionFn = (rocket: Rocket, bodies: Body[], currentYear: number) => boolean;

/**
 * Mission type determines completion behavior
 */
export type MissionType = 'objective' | 'event';
// objective: Requires checkCondition to complete
// event: Auto-completes when year is reached (historical milestone)

/**
 * Unified mission configuration
 * Combines historical events and gameplay objectives
 */
export interface MissionConfig {
    id: string;

    // Timing
    year: number;              // Year this mission becomes available
    month?: number;            // 0-11, optional for more precise dating

    // Display info (i18n keys)
    title: string;
    description: string;
    flavorText?: string;
    image?: string;       // URL for visual context

    // Origin
    country?: string | string[];          // USA, USSR, ESA, China, etc.
    agency?: string | string[];           // ID from Agencies config

    // Mission behavior
    type: MissionType;

    // For 'objective' type only
    conditionLabel?: string;   // Human-readable condition text
    checkCondition?: ConditionFn;

    // Rewards
    rewardMoney?: number;      // Money earned on completion
    unlockedParts?: string[];  // Parts unlocked on completion

    // Launch configuration
    launchPad?: string;        // Launch pad ID (e.g., 'baikonur', 'cape_canaveral')
}

/**
 * Runtime mission instance (includes completion state)
 */
export interface Mission extends MissionConfig {
    completed: boolean;
}

/**
 * Year group for chronology display
 */
export interface YearGroup {
    year: number;
    missions: Mission[];
    status: 'past' | 'current' | 'future';
}
