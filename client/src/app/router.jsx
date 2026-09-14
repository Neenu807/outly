import { Routes, Route } from "react-router-dom";
import AppLayout from "@/shared/components/AppLayout";
import Home from "@/pages/Home";
import Activities from "@/pages/Activities";
import NotFound from "@/pages/NotFound";

/**
 * Protected and role-aware routes arrive in Phase 1, gated on the auth
 * bootstrap so a refresh never flashes a redirect to /login (§22).
 */
function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default AppRouter;
