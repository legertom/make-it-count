import { defineAgent } from "eve";
import { createAnthropic } from "@ai-sdk/anthropic";

/**
 * Model for the feedback agent.
 *
 * - With ANTHROPIC_API_KEY set, calls Anthropic directly.
 * - Otherwise the gateway id routes through Vercel AI Gateway, which needs
 *   AI_GATEWAY_API_KEY locally and authenticates automatically on Vercel.
 */
const anthropicKey = process.env.ANTHROPIC_API_KEY;

export default defineAgent({
  // The feedback agent only needs submit_feedback. Turning off the default
  // bash/file/web tools also keeps eve from provisioning a code sandbox.
  defaultTools: false,
  model: anthropicKey
    ? createAnthropic({ apiKey: anthropicKey })("claude-sonnet-5")
    : "anthropic/claude-sonnet-5",
});
