import { z } from "zod";

export const clientFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Jméno musí mít alespoň 2 znaky" })
    .max(100, { message: "Jméno může mít maximálně 100 znaků" }),
  email: z
    .string()
    .trim()
    .email({ message: "Neplatná emailová adresa" })
    .max(255, { message: "Email může mít maximálně 255 znaků" })
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(20, { message: "Telefon může mít maximálně 20 znaků" })
    .optional()
    .or(z.literal("")),
  trainingGoals: z
    .array(z.string())
    .default([]),
  notes: z
    .string()
    .trim()
    .max(2000, { message: "Poznámky mohou mít maximálně 2000 znaků" })
    .optional()
    .or(z.literal("")),
  healthRestrictions: z
    .string()
    .trim()
    .max(1000, { message: "Zdravotní omezení mohou mít maximálně 1000 znaků" })
    .optional()
    .or(z.literal("")),
  creditBalance: z
    .number()
    .optional()
    .default(0),
  birthDate: z
    .string()
    .optional()
    .or(z.literal("")),
  gender: z
    .enum(["male", "female"])
    .optional(),
  createdAt: z
    .string()
    .optional()
    .or(z.literal("")),
  // Feedback settings
  feedbackEnabled: z
    .boolean()
    .default(true),
  // Extended fields
  handedness: z
    .enum(["left", "right", "ambidextrous"])
    .optional()
    .nullable(),
  sports_history: z
    .string()
    .trim()
    .max(2000, { message: "Sportovní historie může mít maximálně 2000 znaků" })
    .optional()
    .nullable(),
  // Extended fields from diagnostics (legacy)
  occupation: z.string().optional().nullable(),
  sitting_hours_daily: z.number().optional().nullable(),
  current_activities: z.array(z.string()).optional().nullable(),
  sleep_hours: z.number().optional().nullable(),
  stress_level: z.number().optional().nullable(),
  dietary_restrictions: z.array(z.string()).optional().nullable(),
  supplements: z.array(z.string()).optional().nullable(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
