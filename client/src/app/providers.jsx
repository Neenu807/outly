import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter } from "react-router-dom";
import AuthProvider from "@/features/auth/AuthProvider";
import queryClient from "@/shared/lib/queryClient";

/**
 * Every app-wide provider mounts here (ARCHITECTURE §29), so main.jsx stays a
 * mount point and App.jsx stays a shell.
 */
function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default Providers;
