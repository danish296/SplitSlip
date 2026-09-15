import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * Direct download endpoint for SplitSlip Android APK
 * URL: https://<deployment>.convex.site/download/apk
 */
http.route({
  path: "/download/apk",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const defaultStorageId = "kg29abkqcwtnx5fmy39zy2ssbh8efxpw";
    const url = await ctx.storage.getUrl(defaultStorageId);
    if (!url) {
      return new Response("SplitSlip APK not found in storage.", { status: 404 });
    }
    return Response.redirect(url, 302);
  }),
});

export default http;
