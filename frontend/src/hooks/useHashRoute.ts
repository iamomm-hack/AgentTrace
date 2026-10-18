import { useCallback, useEffect, useState } from "react";
import type { Route } from "../types/frontend";

const routes = new Set<Route>(["overview", "runs", "replay", "failures", "import"]);

function readRoute(): Route {
  const requested = window.location.hash.slice(1) as Route;
  return routes.has(requested) ? requested : "overview";
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    if (window.location.hash !== `#${next}`) window.location.hash = next;
    else setRoute(next);
  }, []);

  return { route, navigate };
}
