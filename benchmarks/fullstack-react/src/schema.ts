import { z } from "zod/v4";

export const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  subject: z.enum(["general", "support", "billing", "partnership"]),
  message: z.string().min(10, "Message must be at least 10 characters").max(500, "Message too long"),
  priority: z.enum(["low", "medium", "high"]),
  subscribe: z.boolean(),
});

export type Contact = z.infer<typeof contactSchema>;
