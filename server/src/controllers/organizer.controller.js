import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import {
  getOrganizerRequestStatus,
  submitOrganizerRequest,
} from "../services/organizer.service.js";

/** `req.user` is loaded fresh by requireAuth, so this needs no query. */
const getMyOrganizerRequest = (req, res) =>
  sendSuccess(res, { data: { request: getOrganizerRequestStatus(req.user) } });

const createOrganizerRequest = asyncHandler(async (req, res) => {
  const user = await submitOrganizerRequest(req.user, req.body);

  return sendSuccess(res, {
    status: 201,
    data: { request: getOrganizerRequestStatus(user) },
  });
});

export { getMyOrganizerRequest, createOrganizerRequest };
