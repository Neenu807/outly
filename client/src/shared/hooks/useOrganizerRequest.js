import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/shared/lib/axiosClient";
import queryKeys from "@/shared/lib/queryKeys";

/** The signed-in member's own organizer request — GET /organizer/request. */
export const useOrganizerRequest = () =>
  useQuery({
    queryKey: queryKeys.organizer.request,
    queryFn: async () => {
      const { data } = await axiosClient.get("/organizer/request");

      return data.data.request;
    },
  });

export const useSubmitOrganizerRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const { data } = await axiosClient.post("/organizer/request", body);

      return data.data.request;
    },
    onSuccess: (request) => {
      queryClient.setQueryData(queryKeys.organizer.request, request);
      // organizerStatus is on the user too, and the navbar reads it from there.
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
};
