import Navbar from "./Navbar";

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default AppLayout;