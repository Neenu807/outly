import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/shared/hooks/useAuth";
import useCurrentUser from "@/shared/hooks/useCurrentUser";
import { endSession, useLogin, useLogout, useRegister } from "@/shared/hooks/useAuthMutations";
import { onSessionExpired } from "@/shared/lib/tokenStore";

/**
 * Owns the session for the whole app (§22).
 *
 * `isBootstrapping` stays true until GET /auth/me has settled — through the
 * refresh cookie if needed — and the router renders nothing protected until
 * then. Skip that and every hard refresh flashes a redirect to /login.
 *
 * Everything here is UX. The server enforces every rule independently (§18).
 */
function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const login = useLogin();
  const register = useRegister();
  const logout = useLogout();

  // A refresh that fails mid-visit becomes "signed out" for every screen at
  // once, instead of each one discovering it separately.
  useEffect(() => onSessionExpired(() => endSession(queryClient)), [queryClient]);

  const value = {
    user: currentUser.data ?? null,
    isBootstrapping: currentUser.isPending,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
