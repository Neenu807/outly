/**
 * One entry in the admin review queue (§7).
 *
 * "The queue is not a rubber stamp": the admin sees the request itself, the
 * account's age, city, interests and verification state, and any previous
 * decision with its reason — so an approval is a judgement, not a click.
 *
 * Booking history, the most useful signal of all, joins this shape in Phase 3,
 * when bookings exist. It is omitted rather than returned as zeros, because a
 * zero would claim "has attended nothing" when the truth is "not yet known".
 */
const toOrganizerQueueItem = (user) => ({
  userId: String(user._id),
  name: user.name,
  email: user.email,
  city: user.city ?? null,
  interests: user.interests ?? [],
  isEmailVerified: user.isEmailVerified,
  accountCreatedAt: user.createdAt,
  organizerStatus: user.organizerStatus,
  request: user.organizerRequest
    ? {
        message: user.organizerRequest.message,
        contactLink: user.organizerRequest.contactLink ?? null,
        requestedAt: user.organizerRequest.requestedAt,
      }
    : null,
  review: user.organizerReviewedAt
    ? {
        reviewedAt: user.organizerReviewedAt,
        reviewedBy: user.organizerReviewedBy ? String(user.organizerReviewedBy) : null,
        rejectionReason: user.organizerRejectionReason ?? null,
      }
    : null,
});

export default toOrganizerQueueItem;
