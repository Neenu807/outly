import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import VerificationBanner from "./VerificationBanner";

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <VerificationBanner />

      <div className="flex-1">
        <Outlet />
      </div>

      <footer className="border-t border-slate-200 py-6">
        <p className="mx-auto max-w-5xl px-4 text-xs text-slate-400 sm:px-6">
          Outly — activity discovery and booking
        </p>
      </footer>
    </div>
  );
}

export default AppLayout;
