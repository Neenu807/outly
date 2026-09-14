import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import toUserResponse from "../utils/userResponse.js";
import { updateProfile } from "../services/user.service.js";

const updateMe = asyncHandler(async (req, res) => {
  const user = await updateProfile(req.user, req.body);

  return sendSuccess(res, { data: { user: toUserResponse(user) } });
});

export { updateMe };
