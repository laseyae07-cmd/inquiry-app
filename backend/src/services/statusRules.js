// The ONE place that defines which status changes are allowed.
// Each status lists the statuses it is allowed to move to.

export const ALLOWED_TRANSITIONS = {
    'New': ['In Progress'],
    'In Progress': ['New', 'Resolved'],
    'Resolved': ['In Progress'], // reopen
};

export function canTransition(from, to) {
    return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}