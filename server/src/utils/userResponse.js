/**
 * The public shape of a user — an explicit whitelist, never a spread.
 *
 * `isEmailVerified` and `organizerStatus` are here because the UI needs them to
 * render the verification prompt and the organizer state (§22). Hashes,
 * token expiries and `tokenVersion` are never here.
 */
const toUserResponse = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  organizerStatus: user.organizerStatus,
  isEmailVerified: user.isEmailVerified,
  avatarUrl: user.avatarUrl ?? null,
  interests: user.interests ?? [],
  city: user.city ?? null,
  phone: user.phone ?? null,
  smsOptIn: user.smsOptIn,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export default toUserResponse;
