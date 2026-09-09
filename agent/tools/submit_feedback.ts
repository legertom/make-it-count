import { defineTool } from "eve/tools";
import { z } from "zod";
import { internalPost } from "../lib/app";

const outputSchema = z.object({ id: z.string(), screenshotAttached: z.boolean() });
type Result = z.infer<typeof outputSchema>;

export default defineTool({
  outputSchema,
  description:
    "File the user's feedback about the Make It Count course as a bug report, feature request, or other note. Call once per distinct item, after you have a clear title and description.",
  inputSchema: z.object({
    type: z
      .enum(["bug", "feature", "other"])
      .describe("bug = broken or wrong; feature = request or idea; other = comment, question, or content note"),
    title: z.string().min(3).max(140).describe("One scannable line under 80 characters."),
    description: z
      .string()
      .min(1)
      .max(8000)
      .describe("What happened, where, and what they expected. Steps if given. No invented details."),
    page: z.string().max(500).optional().describe("Browser path from client context, e.g. '/'."),
    coursePage: z.string().max(100).optional().describe("Course page key from client context, e.g. 'h3b'."),
    screenshotId: z
      .string()
      .max(100)
      .optional()
      .describe("The shot_... id from a '[Screenshot attached: ...]' marker in the conversation."),
  }),
  label: {
    start: ({ type, title }) => `File ${type}: ${title}`,
    complete: (_input, output) => `Filed as ${output.id}`,
  },
  async execute(input, ctx) {
    const principal = ctx.session.auth.current ?? ctx.session.auth.initiator;
    const attr = (k: string): string | undefined => {
      const v = principal?.attributes?.[k];
      return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
    };
    const email = attr("email") ?? principal?.principalId;
    if (!email || !email.includes("@")) {
      throw new Error("No signed-in Clever user on this session. Ask them to reload and sign in.");
    }

    const result = await internalPost<Result>("/api/internal/feedback", {
      ...input,
      submittedBy: email,
      submitterName: attr("name") || null,
      agentSessionId: ctx.session.id,
    });
    return result;
  },
});
