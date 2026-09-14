import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/shared/lib/axiosClient";
import queryKeys from "@/shared/lib/queryKeys";

/**
 * Every server call goes through a custom hook (ARCHITECTURE §22). No
 * component calls axios directly and no component writes a query key by hand,
 * so a change to an endpoint touches one file.
 *
 * This is the pattern the ~18 hooks in Phases 1–6 follow.
 */
const useHealth = () =>
  useQuery({
    queryKey: queryKeys.health,
    queryFn: async () => {
      const { data } = await axiosClient.get("/health");

      return data.data;
    },
    // The point of the Phase 0 slice is to show live state, so don't serve it
    // from cache.
    staleTime: 0,
    // This panel is a liveness indicator, so it heals itself: the interval keeps
    // firing while the query is in its error state, which is what lets the
    // panel recover on its own once the API comes back.
    //
    // Polling is NOT a retry loop — each tick is one fresh fetch, bounded by the
    // queryClient's `retry` policy. The ErrorState's `refetch()` button stays as
    // the manual path for anyone who doesn't want to wait out the interval.
    //
    // Scoped to this hook deliberately: the global defaults stay untouched, so
    // no other query starts polling by inheritance.
    refetchInterval: 10_000,
  });

export default useHealth;
