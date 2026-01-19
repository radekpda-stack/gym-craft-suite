import { z } from "zod";

export const clientFormSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, { message: "Křestní jméno je povinné" })
    .max(50, { message: "Křestní jméno může mít maximálně 50 znaků" }),
  last_name: z
    .string()
    .trim()
    .min(1, { message: "Příjmení je povinné" })
    .max(50, { message: "Příjmení může mít maximálně 50 znaků" }),
  // Legacy name field - will be computed from first_name + last_name
  name: z
    .string()
    .trim()
    .optional(),
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
  sitting_hours_daily: z
    .number()
    .min(0, { message: "Hodiny vsedě nemohou být záporné" })
    .max(24, { message: "Hodiny vsedě nemohou přesáhnout 24" })
    .optional()
    .nullable(),
  current_activities: z.array(z.string()).optional().nullable(),
  sleep_hours: z
    .number()
    .min(0, { message: "Hodiny spánku nemohou být záporné" })
    .max(24, { message: "Hodiny spánku nemohou přesáhnout 24" })
    .optional()
    .nullable(),
  stress_level: z
    .number()
    .min(1, { message: "Úroveň stresu musí být alespoň 1" })
    .max(10, { message: "Úroveň stresu může být maximálně 10" })
    .optional()
    .nullable(),
  dietary_restrictions: z.array(z.string()).optional().nullable(),
  supplements: z.array(z.string()).optional().nullable(),
  // Pre-diagnostic data fields with range validation
  height: z
    .number()
    .min(50, { message: "Výška musí být alespoň 50 cm" })
    .max(250, { message: "Výška může být maximálně 250 cm" })
    .optional()
    .nullable(),
  weight: z
    .number()
    .min(20, { message: "Váha musí být alespoň 20 kg" })
    .max(300, { message: "Váha může být maximálně 300 kg" })
    .optional()
    .nullable(),
  sleep_quality: z.string().optional().nullable(),
  pain_areas: z.array(z.string()).optional().nullable(),
  injury_history: z.string().optional().nullable(),
  surgery_history: z.string().optional().nullable(),
  movement_frequency: z.string().optional().nullable(),
  daily_activity_type: z.string().optional().nullable(),
  training_dislikes: z.array(z.string()).optional().nullable(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
