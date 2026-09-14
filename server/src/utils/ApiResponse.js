/**
 * The success envelope (ARCHITECTURE §19, §29):
 *   { success: true, data, meta?: { page, limit, total, totalPages } }
 *
 * Built in one place so no controller hand-rolls a response shape.
 */

const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
});

const sendSuccess = (res, { status = 200, data = null, meta } = {}) => {
  const body = { success: true, data };

  if (meta) {
    body.meta = meta;
  }

  return res.status(status).json(body);
};

const sendPaginated = (res, { status = 200, data, page, limit, total }) =>
  sendSuccess(res, { status, data, meta: buildMeta({ page, limit, total }) });

/** 204 carries no body — not even the envelope. */
const sendNoContent = (res) => res.status(204).end();

export { sendSuccess, sendPaginated, sendNoContent, buildMeta };
