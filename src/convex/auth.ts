// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { emailOtp } from "./auth/emailOtp";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    emailOtp,
    Anonymous,
    Password({
      profile(params) {
        const res: Record<string, any> = {
          email: (params.email as string).toLowerCase().trim(),
          name: (params.name as string | undefined)?.trim() || "SplitSlip User",
        };
        if (params.phone) res.phone = (params.phone as string).trim();
        if (params.username) res.username = (params.username as string).trim().toLowerCase();
        if (params.upiId) res.upiId = (params.upiId as string).trim();
        return res as { email: string };
      },
    }),
  ],
});