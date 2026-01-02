import { z } from "zod";

// Public feedback form validation
export const feedbackFormSchema = z.object({
  token: z
    .string()
    .min(1, { message: "Token je povinný" }),
  // Slider values (1-10 scale)
  values: z.record(
    z.number().min(1).max(10)
  ),
  // Pain areas (optional)
  pain_areas: z
    .array(z.string())
    .optional(),
  pain_area_intensities: z
    .record(z.object({
      intensity: z.number().min(1).max(10),
      isNew: z.boolean().optional(),
    }))
    .optional(),
  pain_area_other: z
    .string()
    .max(200)
    .optional(),
  pain_type: z
    .enum(["muscle", "joint"])
    .optional()
    .nullable(),
  // Sleep data
  sleep_after: z
    .enum(["poor", "average", "good"])
    .optional()
    .nullable(),
  sleep_hours: z
    .number()
    .min(0)
    .max(24)
    .optional(),
  // Note
  note: z
    .string()
    .max(500, { message: "Poznámka může mít maximálně 500 znaků" })
    .optional(),
});

export type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

// Trainer feedback evaluation schema
export const feedbackEvaluationSchema = z.object({
  training_id: z.string().uuid(),
  trainer_response: z
    .string()
    .max(2000)
    .optional()
    .nullable(),
  follow_up_action: z
    .enum(["none", "monitor", "adjust_program", "contact_client", "refer_specialist"])
    .optional()
    .nullable(),
  priority: z
    .enum(["low", "medium", "high"])
    .default("low"),
  is_resolved: z
    .boolean()
    .default(false),
});

export type FeedbackEvaluationValues = z.infer<typeof feedbackEvaluationSchema>;
