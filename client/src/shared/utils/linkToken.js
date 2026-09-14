/**
 * Email links carry their token in the URL fragment (`#token=…`), which the
 * browser never sends to a server or puts in a Referer header.
 */

export const readLinkToken = () =>
  new URLSearchParams(window.location.hash.slice(1)).get("token");

/** Removes the token from the address bar and from history once it is read. */
export const clearLinkTokenFromUrl = () => {
  if (window.location.hash) {
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );
  }
};
