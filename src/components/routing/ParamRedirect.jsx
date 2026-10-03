import React from "react";
import { Navigate, useParams } from "react-router-dom";

/** Redirects a retired route to its replacement, carrying the route parameters across. */
export default function ParamRedirect({ to }) {
  const params = useParams();
  const path = to.replace(/:(\w+)/g, (_, key) => encodeURIComponent(params[key] ?? ""));
  return <Navigate to={path} replace />;
}