import type { Mission } from '../../missions';

export interface YearGroup {
    year: number;
    missions: Mission[];  // Now uses missions instead of legacy events
    status: 'success' | 'failure' | 'discovery' | 'future' | 'mixed';
}

export interface ChronologyCallbacks {
    onYearSelect?: (group: YearGroup) => void;
    onClose?: () => void;
}
