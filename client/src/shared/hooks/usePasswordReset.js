import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/shared/lib/axiosClient";
import { endSession } from "./useAuthMutations";

export const useForgotPassword = () =>
  useMutation({
    mutationFn: (email) => axiosClient.post("/auth/forgot-password", { email }),
  });

export const useResetPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ token, password }) =>
      axiosClient.post("/auth/reset-password", { token, password }),
    // The server ended every session for this account; mirror that here.
    onSuccess: () => endSession(queryClient),
  });
};
