import asyncHandler from "../utils/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../utils/ApiResponse.js";
import { runInBackground } from "../utils/background.js";
import toOrganizerQueueItem from "../utils/organizerResponse.js";
import {
  approveOrganizerRequest,
  canReapplyAt,
  listOrganizerRequests,
  rejectOrganizerRequest,
} from "../services/organizer.service.js";
import {
  sendOrganizerApprovedEmail,
  sendOrganizerRejectedEmail,
} from "../services/notification.service.js";

const listRequests = asyncHandler(async (req, res) => {
  const { users, total } = await listOrganizerRequests(req.query);

  return sendPaginated(res, {
    data: users.map(toOrganizerQueueItem),
    page: req.query.page,
    limit: req.query.limit,
    total,
  });
});

const approveRequest = asyncHandler(async (req, res) => {
  const user = await approveOrganizerRequest(req.user, req.params.id);

  sendSuccess(res, { data: { request: toOrganizerQueueItem(user) } });

  runInBackground("organizer approved email", () => sendOrganizerApprovedEmail(user));
});

const rejectRequest = asyncHandler(async (req, res) => {
  const user = await rejectOrganizerRequest(req.user, req.params.id, req.body.reason);

  sendSuccess(res, { data: { request: toOrganizerQueueItem(user) } });

  runInBackground("organizer rejected email", () =>
    sendOrganizerRejectedEmail(user, canReapplyAt(user)),
  );
});

export { listRequests, approveRequest, rejectRequest };
