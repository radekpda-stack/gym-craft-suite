import { z } from "zod";

export const diagnosticFormSchema = z.object({
  client_id: z
    .string()
    .uuid({ message: "Musíte vybrat klienta" }),
  date: z
    .string()
    .min(1, { message: "Datum je povinné" }),
  area_type: z
    .enum(["joint", "muscle"], { required_error: "Vyberte typ oblasti" }),
  area_name: z
    .string()
    .min(1, { message: "Vyberte oblast" }),
  findings: z
    .string()
    .min(1, { message: "Popište nález" })
    .max(2000, { message: "Nález může mít maximálně 2000 znaků" }),
  notes: z
    .string()
    .max(2000, { message: "Poznámky mohou mít maximálně 2000 znaků" })
    .optional()
    .or(z.literal("")),
});

export type DiagnosticFormValues = z.infer<typeof diagnosticFormSchema>;

// Movement quality rating
const movementQualitySchema = z
  .enum(["good", "limited", "poor", "painful"])
  .optional()
  .nullable();

const sideSchema = z
  .enum(["left", "right", "both", "none"])
  .optional()
  .nullable();

// Extended diagnostic assessment
export const diagnosticAssessmentSchema = z.object({
  diagnostic_id: z.string().uuid(),
  diagnostic_level: z.enum(["basic", "standard", "comprehensive"]).optional(),
  // Lifestyle factors
  occupation: z.string().max(100).optional().nullable(),
  sitting_hours_daily: z.number().min(0).max(24).optional().nullable(),
  sleep_hours: z.number().min(0).max(24).optional().nullable(),
  sleep_quality: z.number().min(1).max(10).optional().nullable(),
  stress_level: z.number().min(1).max(10).optional().nullable(),
  // Movement patterns
  squat_quality: movementQualitySchema,
  squat_side: sideSchema,
  squat_note: z.string().max(500).optional().nullable(),
  lunge_quality: movementQualitySchema,
  lunge_side: sideSchema,
  lunge_note: z.string().max(500).optional().nullable(),
  hip_hinge_quality: movementQualitySchema,
  hip_hinge_side: sideSchema,
  hip_hinge_note: z.string().max(500).optional().nullable(),
  push_quality: movementQualitySchema,
  push_side: sideSchema,
  push_note: z.string().max(500).optional().nullable(),
  pull_quality: movementQualitySchema,
  pull_side: sideSchema,
  pull_note: z.string().max(500).optional().nullable(),
  core_stability: movementQualitySchema,
  core_stability_note: z.string().max(500).optional().nullable(),
  // Mobility
  mobility_shoulders: movementQualitySchema,
  mobility_shoulders_side: sideSchema,
  mobility_shoulders_note: z.string().max(500).optional().nullable(),
  mobility_hips: movementQualitySchema,
  mobility_hips_side: sideSchema,
  mobility_hips_note: z.string().max(500).optional().nullable(),
  mobility_thoracic: movementQualitySchema,
  mobility_thoracic_side: sideSchema,
  mobility_thoracic_note: z.string().max(500).optional().nullable(),
  mobility_ankles: movementQualitySchema,
  mobility_ankles_side: sideSchema,
  mobility_ankles_note: z.string().max(500).optional().nullable(),
  // Trainer notes
  trainer_priorities: z.string().max(2000).optional().nullable(),
  trainer_limitations: z.string().max(2000).optional().nullable(),
  trainer_risks: z.string().max(2000).optional().nullable(),
  trainer_other_notes: z.string().max(2000).optional().nullable(),
});

export type DiagnosticAssessmentValues = z.infer<typeof diagnosticAssessmentSchema>;
