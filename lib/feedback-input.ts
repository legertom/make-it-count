import { z } from "zod";

/** Shape shared by the direct form and the agent's submit_feedback tool. */
export const feedbackInputSchema = z.object({
  type: z.enum(["bug", "feature", "other"]),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(1).max(8000),
  page: z.string().max(500).optional().nullable(),
  coursePage: z.string().max(100).optional().nullable(),
  screenshotId: z.string().max(100).optional().nullable(),
});

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
