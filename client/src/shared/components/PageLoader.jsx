import Spinner from "./Spinner";

function PageLoader({ label = "Loading" }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner size="lg" label={label} />
    </div>
  );
}

export default PageLoader;
