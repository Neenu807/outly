import { Link } from "react-router-dom";

function Navbar() {
  return (
    <header>
      <nav>
        <Link to="/">Outly</Link>
        <Link to="/activities">Activities</Link>
      </nav>
    </header>
  );
}

export default Navbar;