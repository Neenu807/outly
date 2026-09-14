import mongoose from "mongoose";
import User from "../models/User.js";
import { apiError } from "../utils/errorCodes.js";
import { escapeRegex } from "../utils/regex.js";

/**
 * The organizer request lifecycle (ARCHITECTURE §7):
 *
 *   verified member → request → pending → admin approves → approved
 *                                        → admin rejects  → rejected → 30 days → may re-apply
 *
 * A request grants nothing. Only approval changes what a member can do, and
 * rejection changes nothing about their member account.
 */

const REAPPLY_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * A business rule, not an abuse control — which is why it lives here against
 * organizerReviewedAt rather than in a rate limiter (§7).
 */
const canReapplyAt = (user) =>
  user.organizerReviewedAt
    ? new Date(user.organizerReviewedAt.getTime() + REAPPLY_COOLDOWN_MS)
    : null;

const assertMayRequest = (user, now) => {
  if (user.role === "admin" || user.organizerStatus === "approved") {
    throw apiError("ALREADY_ORGANIZER", "This account can already publish activities");
  }

  if (user.organizerStatus === "pending") {
    throw apiError(
      "ORGANIZER_APPLICATION_PENDING",
      "An organizer request is already under review",
    );
  }

  if (user.organizerStatus === "rejected") {
    const reapplyAt = canReapplyAt(user);

    if (reapplyAt && reapplyAt > now) {
      throw apiError(
        "ORGANIZER_APPLICATION_REJECTED",
        "A previous request was not approved and the re-application period has not passed",
        {
          reason: user.organizerRejectionReason ?? null,
          canReapplyAt: reapplyAt.toISOString(),
        },
      );
    }
  }
};

const submitOrganizerRequest = async (user, { message, contactLink }) => {
  const now = new Date();

  assertMayRequest(user, now);

  // The transition is guarded in the filter, not just checked above: two
  // concurrent submissions cannot both open a request, because the second one
  // matches nothing. Same pattern as the booking capacity guard (§8).
  const updated = await User.findOneAndUpdate(
    {
      _id: user._id,
      role: "user",
      $or: [
        { organizerStatus: "none" },
        {
          organizerStatus: "rejected",
          organizerReviewedAt: { $lte: new Date(now.getTime() - REAPPLY_COOLDOWN_MS) },
        },
        { organizerStatus: "rejected", organizerReviewedAt: { $exists: false } },
      ],
    },
    {
      $set: {
        organizerStatus: "pending",
        organizerRequest: { message, contactLink, requestedAt: now },
      },
    },
    { returnDocument: "after", runValidators: true },
  );

  if (updated) {
    return updated;
  }

  // Lost a race. Classify against the state that won, with the same rules.
  const current = await User.findById(user._id);

  if (!current) {
    throw apiError("UNAUTHENTICATED", "Account no longer exists");
  }

  assertMayRequest(current, now);

  // Unreachable: every state the filter rejects is one assertMayRequest throws for.
  throw apiError("INTERNAL", "Organizer request could not be recorded");
};

/** The member's own view of their request — GET /organizer/request. */
const getOrganizerRequestStatus = (user, now = new Date()) => {
  const status = user.organizerStatus;
  const reapplyAt = status === "rejected" ? canReapplyAt(user) : null;
  const request = user.organizerRequest;

  return {
    organizerStatus: status,
    request: request
      ? {
          message: request.message,
          contactLink: request.contactLink ?? null,
          requestedAt: request.requestedAt,
        }
      : null,
    rejectionReason: status === "rejected" ? (user.organizerRejectionReason ?? null) : null,
    reviewedAt: user.organizerReviewedAt ?? null,
    canReapplyAt: reapplyAt ? reapplyAt.toISOString() : null,
    // Organizer standing only. Email verification is checked separately.
    canApply:
      user.role !== "admin" &&
      (status === "none" || (status === "rejected" && (!reapplyAt || reapplyAt <= now))),
  };
};

const listOrganizerRequests = async ({ status, q, page, limit }) => {
  const filter = { organizerStatus: status };

  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  // Pending is a queue, so oldest first. Decided requests read newest decision
  // first. `_id` breaks ties so pages never overlap.
  const sort =
    status === "pending"
      ? { "organizerRequest.requestedAt": 1, _id: 1 }
      : { organizerReviewedAt: -1, _id: 1 };

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { users, total };
};

const decide = async (admin, userId, update) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw apiError("INVALID_ID", "Invalid user id");
  }

  if (String(admin._id) === String(userId)) {
    throw apiError(
      "CANNOT_SELF_MODERATE",
      "Administrators cannot decide their own organizer request",
    );
  }

  // Guarded on `pending`, so a request cannot be decided twice — a second
  // click, or two admins at once, matches nothing.
  const user = await User.findOneAndUpdate({ _id: userId, organizerStatus: "pending" }, update, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!user) {
    throw apiError("NOT_FOUND", "No pending organizer request for this user");
  }

  return user;
};

const approveOrganizerRequest = (admin, userId) =>
  decide(admin, userId, {
    $set: {
      organizerStatus: "approved",
      organizerReviewedBy: admin._id,
      organizerReviewedAt: new Date(),
    },
    $unset: { organizerRejectionReason: 1 },
  });

/**
 * Deliberately leaves tokenVersion alone (§18). A rejected applicant is still a
 * fully valid verified member; ending their session would tell them, wrongly,
 * that they had been removed from the platform.
 */
const rejectOrganizerRequest = (admin, userId, reason) =>
  decide(admin, userId, {
    $set: {
      organizerStatus: "rejected",
      organizerRejectionReason: reason,
      organizerReviewedBy: admin._id,
      organizerReviewedAt: new Date(),
    },
  });

export {
  canReapplyAt,
  submitOrganizerRequest,
  getOrganizerRequestStatus,
  listOrganizerRequests,
  approveOrganizerRequest,
  rejectOrganizerRequest,
};
