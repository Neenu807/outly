/**
 * The access token lives here, in module memory — never in localStorage
 * (ARCHITECTURE §18, §22). A page reload drops it on purpose; the httpOnly
 * refresh cookie is what restores the session, and script cannot read that.
 */

let accessToken = null;

const expiryListeners = new Set();

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const clearAccessToken = () => {
  accessToken = null;
};

/** Subscribe to "the refresh failed mid-session". Returns an unsubscribe. */
export const onSessionExpired = (listener) => {
  expiryListeners.add(listener);

  return () => expiryListeners.delete(listener);
};

export const notifySessionExpired = () => {
  for (const listener of expiryListeners) {
    listener();
  }
};
