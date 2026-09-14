import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/shared/lib/axiosClient";
import queryKeys from "@/shared/lib/queryKeys";

const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changes) => {
      const { data } = await axiosClient.patch("/users/me", changes);

      return data.data.user;
    },
    // The server's answer is the new truth — no refetch needed.
    onSuccess: (user) => queryClient.setQueryData(queryKeys.auth.me, user),
  });
};

export default useUpdateProfile;
