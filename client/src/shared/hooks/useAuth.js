import { createContext, useContext } from "react";

/**
 * `useAuth()` → `{ user, isBootstrapping, login, register, logout }` (§22).
 *
 * `login`, `register` and `logout` are the mutation objects themselves, so a
 * form can read `isPending` and `error` without a second hook.
 */
export const AuthContext = createContext(null);

export default function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }

  return context;
}
