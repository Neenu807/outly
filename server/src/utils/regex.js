/**
 * Makes user input safe to embed in a RegExp. Without this, a search for
 * "a.*" matches everything and a crafted pattern can pin the CPU (ReDoS).
 */
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export { escapeRegex };
