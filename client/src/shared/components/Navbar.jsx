import { Link, NavLink } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Outly
        </Link>

        <nav className="navbar-links">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "navbar-link active" : "navbar-link"
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/activities"
            className={({ isActive }) =>
              isActive ? "navbar-link active" : "navbar-link"
            }
          >
            Activities
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;