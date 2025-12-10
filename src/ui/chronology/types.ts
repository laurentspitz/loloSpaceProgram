import type { HistoryEvent } from '../../data/SpaceHistory';

export interface YearGroup {
    year: number;
    events: HistoryEvent[];
    status: 'success' | 'failure' | 'discovery' | 'future' | 'mixed';
}

export interface ChronologyCallbacks {
    onYearSelect?: (group: YearGroup) => void;
    onClose?: () => void;
}
