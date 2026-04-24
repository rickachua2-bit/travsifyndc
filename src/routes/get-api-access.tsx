import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/get-api-access")({
  component: () => <Navigate to="/signup" replace />,
});
