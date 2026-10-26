import { z } from "zod";

export const homeSearchSchema = z.object({
  view: z.enum(["dashboard", "list", "committee", "audit", "policies", "requests"]).optional(),
});

export type HomeSearch = z.infer<typeof homeSearchSchema>;
