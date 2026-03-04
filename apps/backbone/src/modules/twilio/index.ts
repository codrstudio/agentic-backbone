import type { BackboneModule, ModuleContext, ModuleHealth } from "../types.js";
import { createTwilioRoutes } from "./routes.js";
import { listActiveCalls, clearCalls } from "./calls.js";
import { findChannelsByAdapter } from "../../channels/lookup.js";
import { loadCallbackBaseUrl } from "./config.js";

let started = false;

export const twilioModule: BackboneModule = {
  name: "twilio",

  routes: undefined,

  async start(ctx: ModuleContext): Promise<void> {
    const channels = findChannelsByAdapter("twilio-voice");
    if (channels.length === 0) {
      ctx.log("no twilio-voice channels found, skipping");
      return;
    }

    // Validate callback URL is available
    try {
      loadCallbackBaseUrl(ctx.env);
    } catch (err) {
      ctx.log(`callback URL not configured, skipping: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    // Create routes
    this.routes = createTwilioRoutes();

    // Register "twilio-voice" channel-adapter
    // Voice is synchronous via TwiML webhook response pattern — send() is a no-op
    ctx.registerChannelAdapter("twilio-voice", () => ({
      slug: "twilio-voice",

      async send() {
        // Voice responses are delivered synchronously via TwiML in webhook handlers.
        // This adapter exists only for channel registration/lookup purposes.
      },
    }));

    started = true;
    ctx.log(`started (${channels.length} channel(s))`);
  },

  async stop(): Promise<void> {
    clearCalls();
    started = false;
    this.routes = undefined;
  },

  health(): ModuleHealth {
    if (!started) {
      return { status: "unhealthy", details: { reason: "not started" } };
    }

    const calls = listActiveCalls();
    return {
      status: "healthy",
      details: {
        activeCalls: calls.length,
      },
    };
  },
};
