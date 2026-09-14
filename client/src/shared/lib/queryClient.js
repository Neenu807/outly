import { QueryClient } from "@tanstack/react-query";

/**
 * Query defaults locked in Phase 0 (ARCHITECTURE §22, §29).
 *
 * The retry predicate is the load-bearing part: a 4xx is a decision the server
 * has already made, so retrying it just makes the user wait three times as
 * long for the same answer.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = error?.response?.status;

        if (status >= 400 && status < 500) {
          return false;
        }

        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export default queryClient;
