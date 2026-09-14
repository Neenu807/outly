import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/shared/lib/axiosClient";
import queryKeys from "@/shared/lib/queryKeys";
import { clearAccessToken, setAccessToken } from "@/shared/lib/tokenStore";

// Server state that belongs to one signed-in person. It is dropped whenever the
// session changes hands, so the next person never sees the last one's data.
const USER_SCOPED = [queryKeys.organizer.all, queryKeys.admin.all, queryKeys.bookings.all];

const dropUserScopedQueries = (queryClient) => {
  for (const queryKey of USER_SCOPED) {
    queryClient.removeQueries({ queryKey });
  }
};

const startSession = (queryClient, { accessToken, user }) => {
  setAccessToken(accessToken);
  dropUserScopedQueries(queryClient);
  queryClient.setQueryData(queryKeys.auth.me, user);
};

export const endSession = (queryClient) => {
  clearAccessToken();
  dropUserScopedQueries(queryClient);
  queryClient.setQueryData(queryKeys.auth.me, null);
};

const signIn = async (credentials) => {
  const { data } = await axiosClient.post("/auth/login", credentials);

  return data.data;
};

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signIn,
    onSuccess: (session) => startSession(queryClient, session),
  });
};

/**
 * The API keeps register and login separate (§19). Signing in straight after
 * registering is what lets a new member start browsing within seconds; the
 * verification email can wait until they want to book.
 */
export const useRegister = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, email, password }) => {
      await axiosClient.post("/auth/register", { name, email, password });

      return signIn({ email, password });
    },
    onSuccess: (session) => startSession(queryClient, session),
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => axiosClient.post("/auth/logout"),
    // Settled, not success: even if the call fails, this browser is signed out.
    onSettled: () => endSession(queryClient),
  });
};
