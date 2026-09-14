import { Routes, Route } from "react-router-dom";
import AppLayout from "@/shared/components/AppLayout";
import Home from "@/pages/Home";
import Activities from "@/pages/Activities";
import NotFound from "@/pages/NotFound";
import GuestRoute from "@/features/auth/GuestRoute";
import ProtectedRoute from "@/features/auth/ProtectedRoute";
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import ForgotPasswordPage from "@/features/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/ResetPasswordPage";
import VerifyEmailPage from "@/features/auth/VerifyEmailPage";
import ProfilePage from "@/features/profile/ProfilePage";
import OrganizerRequestPage from "@/features/organizer/OrganizerRequestPage";
import OrganizerRequestsPage from "@/features/admin/OrganizerRequestsPage";

/**
 * Browsing stays open to everyone (§18). Protected routes render nothing until
 * the auth bootstrap resolves (§22).
 */
function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/activities" element={<Activities />} />

        {/* Email links work whether or not the reader is signed in. */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/organizer/request" element={<OrganizerRequestPage />} />
        </Route>

        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin/organizer-requests" element={<OrganizerRequestsPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default AppRouter;
