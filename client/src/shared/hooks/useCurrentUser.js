import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/shared/lib/axiosClient";
import queryKeys from "@/shared/lib/queryKeys";

/**
 * The session bootstrap (§22): GET /auth/me.
 *
 * On a fresh page load there is no access token in memory, so this 401s; the
 * axios interceptor then tries the refresh cookie and retries. A signed-out
 * visitor ends up with `null`, a signed-in one with their user — one code path
 * for both, and for a session that expires mid-visit.
 */
const fetchCurrentUser = async () => {
  try {
    const { data } = await axiosClient.get("/auth/me");

    return data.data.user;
  } catch (error) {
    if (error.response?.status === 401) {
      return null;
    }

    throw error;
  }
};

const useCurrentUser = () =>
  useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchCurrentUser,
    // Changes only through login, logout and the mutations that touch the
    // user, all of which write or invalidate this key themselves.
    staleTime: Infinity,
    retry: false,
  });

export default useCurrentUser;
