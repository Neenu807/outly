/**
 * Transactional email content. Every template returns `{ subject, text, html }`.
 *
 * Anything a person typed — a name, a rejection reason — is HTML-escaped before
 * it reaches markup; an organizer request is otherwise a way to put arbitrary
 * HTML into an email with Outly's name on it.
 *
 * The wording is placeholder copy: it belongs to the UI/UX track (§3) and can
 * be rewritten here without touching any logic.
 */

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

const renderHtml = ({ heading, paragraphs, action }) => `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px">
      <p style="margin:0 0 24px;font-size:18px;font-weight:700">Outly</p>
      <h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(heading)}</h1>
      ${paragraphs
        .map((p) => `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(p)}</p>`)
        .join("\n      ")}
      ${
        action
          ? `<p style="margin:24px 0">
        <a href="${escapeHtml(action.url)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#2563eb;color:#ffffff;font-weight:600;text-decoration:none">${escapeHtml(action.label)}</a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b">If the button doesn't work, paste this link into your browser:<br>${escapeHtml(action.url)}</p>`
          : ""
      }
    </div>
  </body>
</html>`;

const renderText = ({ heading, paragraphs, action }) =>
  [heading, ...paragraphs, action ? `${action.label}: ${action.url}` : null]
    .filter(Boolean)
    .join("\n\n");

const compose = (subject, content) => ({
  subject,
  text: renderText(content),
  html: renderHtml(content),
});

const verificationEmail = ({ name, url }) =>
  compose("Verify your email for Outly", {
    heading: `Hi ${name}, please confirm your email`,
    paragraphs: [
      "Confirming your address lets you book activities, leave reviews and apply to become an organizer.",
      "This link expires in 24 hours. If you didn't create an Outly account, you can ignore this email.",
    ],
    action: { label: "Verify email", url },
  });

const passwordResetEmail = ({ name, url }) =>
  compose("Reset your Outly password", {
    heading: `Hi ${name}, reset your password`,
    paragraphs: [
      "Someone asked to reset the password for this account. The link works once and expires in 1 hour.",
      "Resetting signs you out everywhere. If this wasn't you, ignore this email — your password stays as it is.",
    ],
    action: { label: "Choose a new password", url },
  });

const organizerApprovedEmail = ({ name, url }) =>
  compose("You're approved to organize on Outly", {
    heading: `Good news, ${name}`,
    paragraphs: [
      "Your organizer request was approved. You can now publish activities on Outly.",
    ],
    action: { label: "View your organizer status", url },
  });

const organizerRejectedEmail = ({ name, reason, canReapplyAt, url }) =>
  compose("About your Outly organizer request", {
    heading: `Hi ${name}, an update on your organizer request`,
    paragraphs: [
      "Thanks for applying. We weren't able to approve your request this time.",
      `Reason: ${reason}`,
      canReapplyAt
        ? `You're welcome to apply again from ${formatDate(canReapplyAt)}.`
        : "You're welcome to apply again.",
      "Your member account is unaffected — you can keep browsing, booking and reviewing as before.",
    ],
    action: { label: "View your request", url },
  });

export {
  escapeHtml,
  verificationEmail,
  passwordResetEmail,
  organizerApprovedEmail,
  organizerRejectedEmail,
};
