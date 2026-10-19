// The ONE place that defines who can see which inquiries.
// Rule: admins see everything. Staff see only inquiries they created.

export function canSeeAll(user) {
    return user.role === 'admin';
}

export function canAccess(user, inquiry) {
    return canSeeAll(user) || inquiry.created_by === user.id;
}