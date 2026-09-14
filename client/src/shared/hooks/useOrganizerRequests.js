import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/shared/lib/axiosClient";
import queryKeys from "@/shared/lib/queryKeys";

/** The admin review queue — GET /admin/organizer-requests. */
export const useOrganizerRequests = (filters) =>
  useQuery({
    queryKey: queryKeys.admin.organizerRequests.list(filters),
    queryFn: async () => {
      const { data } = await axiosClient.get("/admin/organizer-requests", { params: filters });

      return { items: data.data, meta: data.meta };
    },
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

const useDecision = (action) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }) => {
      const { data } = await axiosClient.patch(
        `/admin/organizer-requests/${userId}/${action}`,
        action === "reject" ? { reason } : undefined,
      );

      return data.data.request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.organizerRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
    },
  });
};

export const useApproveOrganizer = () => useDecision("approve");

export const useRejectOrganizer = () => useDecision("reject");
