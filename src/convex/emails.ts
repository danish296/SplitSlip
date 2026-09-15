import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Internal mutation to log email delivery event.
 */
export const logEmailEvent = internalMutation({
  args: {
    recipientEmail: v.string(),
    type: v.string(),
    subject: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("simulated")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("emailEvents", {
      recipientEmail: args.recipientEmail,
      type: args.type,
      subject: args.subject,
      status: args.status,
      error: args.error,
      createdAt: Date.now(),
    });
  },
});

/**
 * Convex action: Email delivery provider abstraction.
 * Sends email via configured provider (Resend or HTTP gateway) or fallback simulated logger.
 * Never exposes credentials to the frontend.
 */
export const sendNotificationEmail = action({
  args: {
    to: v.string(),
    type: v.string(),
    subject: v.string(),
    bodyText: v.string(),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "SplitSlip <notifications@splitslip.app>",
            to: args.to,
            subject: args.subject,
            text: args.bodyText,
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          await ctx.runMutation(internal.emails.logEmailEvent, {
            recipientEmail: args.to,
            type: args.type,
            subject: args.subject,
            status: "failed",
            error: err,
          });
          return { status: "failed", error: err };
        }

        await ctx.runMutation(internal.emails.logEmailEvent, {
          recipientEmail: args.to,
          type: args.type,
          subject: args.subject,
          status: "sent",
        });
        return { status: "sent" };
      } catch (err: any) {
        await ctx.runMutation(internal.emails.logEmailEvent, {
          recipientEmail: args.to,
          type: args.type,
          subject: args.subject,
          status: "failed",
          error: err?.message || String(err),
        });
        return { status: "failed", error: err?.message };
      }
    } else {
      // Graceful fallback: simulated mode for development and local testing
      console.log(`[EmailProvider (Simulated)] To: ${args.to} | Subject: ${args.subject}\nBody:\n${args.bodyText}`);

      await ctx.runMutation(internal.emails.logEmailEvent, {
        recipientEmail: args.to,
        type: args.type,
        subject: args.subject,
        status: "simulated",
      });

      return { status: "simulated" };
    }
  },
});
