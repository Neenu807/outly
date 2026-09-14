import User from "../models/User.js";
import { apiError } from "../utils/errorCodes.js";

/**
 * Applies an already-validated profile change. `changes` contains only the
 * whitelisted fields from user.validator.js; a null value clears the field.
 */
const updateProfile = async (user, changes) => {
  const $set = {};
  const $unset = {};

  for (const [field, value] of Object.entries(changes)) {
    if (value === null) {
      $unset[field] = 1;
    } else {
      $set[field] = value;
    }
  }

  // SMS needs a phone (§17). Opting in without one is refused; removing the
  // phone withdraws the opt-in with it, so the two can never disagree.
  const phoneAfter = Object.hasOwn(changes, "phone") ? changes.phone : user.phone;

  if (!phoneAfter) {
    if (changes.smsOptIn === true) {
      throw apiError("VALIDATION_FAILED", "Add a phone number before turning on SMS", {
        smsOptIn: "Add a phone number before turning on SMS",
      });
    }

    $set.smsOptIn = false;
  }

  const update = {};

  if (Object.keys($set).length > 0) update.$set = $set;
  if (Object.keys($unset).length > 0) update.$unset = $unset;

  const updated = await User.findByIdAndUpdate(user._id, update, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!updated) {
    throw apiError("UNAUTHENTICATED", "Account no longer exists");
  }

  return updated;
};

export { updateProfile };
