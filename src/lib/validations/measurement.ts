import { z } from "zod";

// Positive number or null helper
const positiveOrNull = z
  .number()
  .positive({ message: "Hodnota musí být kladná" })
  .optional()
  .nullable();

export const measurementFormSchema = z.object({
  client_id: z
    .string()
    .uuid({ message: "Musíte vybrat klienta" }),
  date: z
    .string()
    .min(1, { message: "Datum je povinné" }),
  // Body measurements
  weight_kg: positiveOrNull,
  height_cm: positiveOrNull,
  body_fat_percent: z
    .number()
    .min(1, { message: "Minimální hodnota je 1%" })
    .max(60, { message: "Maximální hodnota je 60%" })
    .optional()
    .nullable(),
  muscle_mass_kg: positiveOrNull,
  bmi: positiveOrNull,
  bmr: positiveOrNull,
  visceral_fat: z
    .number()
    .min(1)
    .max(30)
    .optional()
    .nullable(),
  metabolic_age: z
    .number()
    .min(10)
    .max(100)
    .optional()
    .nullable(),
  water_percent: z
    .number()
    .min(20)
    .max(80)
    .optional()
    .nullable(),
  bone_mass_kg: positiveOrNull,
  // Circumferences
  chest_cm: positiveOrNull,
  waist_cm: positiveOrNull,
  hips_cm: positiveOrNull,
  arm_left: positiveOrNull,
  arm_right: positiveOrNull,
  thigh_left: positiveOrNull,
  thigh_right: positiveOrNull,
  calf_left: positiveOrNull,
  calf_right: positiveOrNull,
  // Mental state
  mental_state: z
    .enum(["excellent", "good", "neutral", "tired", "exhausted"])
    .optional()
    .nullable(),
  // Notes
  notes: z
    .string()
    .max(2000, { message: "Poznámky mohou mít maximálně 2000 znaků" })
    .optional()
    .or(z.literal("")),
  // Source file
  source_file_url: z
    .string()
    .url()
    .optional()
    .nullable(),
});

export type MeasurementFormValues = z.infer<typeof measurementFormSchema>;

// Simplified schema for quick measurement entry
export const quickMeasurementSchema = z.object({
  client_id: z.string().uuid(),
  date: z.string(),
  weight_kg: z.number().positive().optional(),
  body_fat_percent: z.number().min(1).max(60).optional(),
  notes: z.string().max(500).optional(),
});

export type QuickMeasurementValues = z.infer<typeof quickMeasurementSchema>;
