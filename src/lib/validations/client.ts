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
    .max(255, { message: "Email může mít maximálně 255 znaků" }),
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
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
