import env from "../config/env.js";
import logger from "../config/logger.js";
import { sendEmail } from "./external/email.service.js";
import {
  organizerApprovedEmail,
  organizerRejectedEmail,
  passwordResetEmail,
  verificationEmail,
} from "../templates/emails/index.js";

/**
 * Decides what to send and to whom (ARCHITECTURE §17). Transports only know how.
 *
 * Every function here RESOLVES, whatever happens: a failed send is logged and
 * swallowed, so a provider outage can never fail the action that triggered it.
 * Callers dispatch these after the response, through utils/background.js.
 *
 * SMS joins this module in Phase 6.
 */

const clientBase = env.CLIENT_URL.replace(/\/+$/, "");

/**
 * The token rides in the URL FRAGMENT. Browsers never send a fragment to a
 * server or include it in a Referer header, so the token cannot leak into an
 * access log or to a third party the page happens to link to.
 */
const clientLink = (path, token) =>
  `${clientBase}${path}${token ? `#token=${encodeURIComponent(token)}` : ""}`;

const deliver = async (event, user, message) => {
  try {
    await sendEmail({ to: user.email, ...message });
  } catch (error) {
    // The address and the body stay out of the log (§16).
    logger.warn(
      { event, userId: String(user._id), code: error?.code },
      "Notification email failed",
    );
  }
};

const sendVerificationEmail = (user, token) =>
  deliver(
    "email.verification",
    user,
    verificationEmail({ name: user.name, url: clientLink("/verify-email", token) }),
  );

const sendPasswordResetEmail = (user, token) =>
  deliver(
    "password.reset",
    user,
    passwordResetEmail({ name: user.name, url: clientLink("/reset-password", token) }),
  );

const sendOrganizerApprovedEmail = (user) =>
  deliver(
    "organizer.approved",
    user,
    organizerApprovedEmail({ name: user.name, url: clientLink("/organizer/request") }),
  );

const sendOrganizerRejectedEmail = (user, canReapplyAt) =>
  deliver(
    "organizer.rejected",
    user,
    organizerRejectedEmail({
      name: user.name,
      reason: user.organizerRejectionReason,
      canReapplyAt,
      url: clientLink("/organizer/request"),
    }),
  );

export {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrganizerApprovedEmail,
  sendOrganizerRejectedEmail,
};
