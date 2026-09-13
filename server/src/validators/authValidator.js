import { z } from "zod";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),

  email: z.string().trim().email("Please provide a valid email"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email"),

  password: z.string().min(1, "Password is required"),
}); 

export { registerSchema, loginSchema };