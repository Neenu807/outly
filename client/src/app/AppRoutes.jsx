import { Routes, Route } from "react-router-dom";
import Home from "../discover/Home.jsx" ;
import Activities from "../activities/Activities.jsx";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/activities" element={<Activities />} />
    </Routes>
  );
}

export default AppRoutes;