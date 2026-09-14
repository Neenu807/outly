import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/shared/lib/axiosClient";
import { endSession } from "./useAuthMutations";

/** PATCH /auth/password (§18, §19). */
const useChangePassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      axiosClient.patch("/auth/password", { currentPassword, newPassword }),
    // The server ended every session for this account, this one included.
    onSuccess: () => endSession(queryClient),
  });
};

export default useChangePassword;
