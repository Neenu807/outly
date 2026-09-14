import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/shared/lib/axiosClient";
import queryKeys from "@/shared/lib/queryKeys";

export const useVerifyEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token) => axiosClient.post("/auth/verify-email", { token }),
    // Clears the verification banner in every open view, with no re-login.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
  });
};

export const useResendVerification = () =>
  useMutation({
    mutationFn: () => axiosClient.post("/auth/resend-verification"),
  });
