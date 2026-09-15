import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://frugal-hornet-670.convex.cloud";

export const convex = new ConvexReactClient(convexUrl);
