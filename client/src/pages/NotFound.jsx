import { useNavigate } from "react-router-dom";
import EmptyState from "@/shared/components/EmptyState";

function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <EmptyState
        title="Page not found"
        description="That link doesn't lead anywhere. It may have moved, or it may never have existed."
        actionLabel="Back to home"
        onAction={() => navigate("/")}
      />
    </main>
  );
}

export default NotFound;
