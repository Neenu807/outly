import { Link, NavLink, useNavigate } from "react-router-dom";
import Button from "./Button";
import useAuth from "@/shared/hooks/useAuth";

const linkClass = ({ isActive }) =>
  [
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-50 text-brand-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");

const ORGANIZER_LINK_LABEL = {
  none: "Become an organizer",
  pending: "Request under review",
  rejected: "Organizer request",
  approved: "Organizer",
};

function Navbar() {
  const { user, isBootstrapping, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => logout.mutate(undefined, { onSettled: () => navigate("/") });

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link to="/" className="text-lg font-bold tracking-tight text-slate-900">
          Outly
        </Link>

        <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
          <NavLink to="/" end className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/activities" className={linkClass}>
            Activities
          </NavLink>

          {/* Reserve the space while the session resolves, so a signed-in
              member never sees "Log in" flash on a hard refresh. */}
          {isBootstrapping ? (
            <span className="inline-block h-9 w-32" aria-hidden="true" />
          ) : user ? (
            <>
              {user.role === "admin" ? (
                <NavLink to="/admin/organizer-requests" className={linkClass}>
                  Review queue
                </NavLink>
              ) : (
                <NavLink to="/organizer/request" className={linkClass}>
                  {ORGANIZER_LINK_LABEL[user.organizerStatus] ?? "Organize"}
                </NavLink>
              )}
              <NavLink to="/profile" className={linkClass}>
                Profile
              </NavLink>
              <Button variant="ghost" size="sm" onClick={handleLogout} disabled={logout.isPending}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>
                Log in
              </NavLink>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
