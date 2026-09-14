import mongoose from "mongoose";

/**
 * The User model (ARCHITECTURE §7).
 *
 * Two roles, and one field for the organizer capability. `organizerStatus`
 * carries both "may this member publish" and "where is their request", because
 * two fields encoding one fact will drift (D1, W2). There is no organizer role
 * and there is no general account approval.
 */

const ROLES = Object.freeze(["user", "admin"]);
const ORGANIZER_STATUSES = Object.freeze(["none", "pending", "approved", "rejected"]);
const E164 = /^\+[1-9]\d{7,14}$/;

const organizerRequestSchema = new mongoose.Schema(
  {
    // "What will you run?" — the thing the admin actually judges.
    message: {
      type: String,
      trim: true,
      required: true,
      minlength: 30,
      maxlength: 500,
    },
    contactLink: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => value == null || /^https:\/\/\S+$/i.test(value),
        message: "contactLink must be an https:// URL",
      },
    },
    requestedAt: { type: Date, required: true },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // select: false at the schema, so a forgotten projection cannot leak it.
    passwordHash: { type: String, required: true, select: false },

    role: { type: String, enum: ROLES, default: "user" },

    // ---- organizer capability and its approval state (§7) ------------------
    // Written only by the organizer request endpoint and the two admin decision
    // endpoints — never by PATCH /users/me (§21).
    organizerStatus: { type: String, enum: ORGANIZER_STATUSES, default: "none" },
    organizerRequest: { type: organizerRequestSchema, default: undefined },
    organizerReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    organizerReviewedAt: Date,
    organizerRejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
      // A rejection without a reason is a decision the member cannot act on.
      // `this` is the document on save but the query (or undefined) inside an
      // update validator, hence the optional chaining. Updates are covered by
      // the reject endpoint's Zod schema, which requires the reason.
      required: [
        function () {
          return this?.organizerStatus === "rejected";
        },
        "A reason is required when an organizer request is rejected",
      ],
    },

    // ---- contact and personalisation --------------------------------------
    // SMS needs a phone AND opt-in AND SMS_ENABLED — three independent
    // conditions, so a misconfiguration degrades to silence (§17).
    phone: {
      type: String,
      trim: true,
      match: [E164, "phone must be in E.164 format, e.g. +919876543210"],
    },
    smsOptIn: { type: Boolean, default: false },

    avatarUrl: { type: String, trim: true },

    // Category slugs — feeds discovery scoring (§14).
    interests: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
      validate: {
        validator: (value) => value.length <= 15,
        message: "At most 15 interests",
      },
    },

    city: { type: String, trim: true, maxlength: 60 },

    // ---- verification, recovery and session revocation (§18) --------------
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // Bumped on exactly three events: logout, password reset, password change.
    // Never on organizer rejection (§18). Carried in both token payloads and
    // compared on every request, so a bump invalidates every issued token.
    tokenVersion: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// §13. `{ email: 1 }` unique is declared on the field above.
userSchema.index({ interests: 1 });
userSchema.index({ organizerStatus: 1, "organizerRequest.requestedAt": 1 });

const User = mongoose.model("User", userSchema);

export default User;
export { ROLES, ORGANIZER_STATUSES };
