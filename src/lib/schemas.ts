import { z } from "zod";

// Project Schemas
export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional(),
});

export const updateProjectSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  allowedDomains: z.array(z.string()).optional(),
});

export const deleteProjectSchema = z.object({
  projectId: z.string(),
});

export const refreshApiKeySchema = z.object({
  projectId: z.string(),
});

// GitHub Integration Schemas
export const githubIntegrationSchema = z.object({
  projectId: z.string(),
  personalAccessToken: z.string().optional(),
  repositoryOwner: z.string(),
  repositoryName: z.string(),
  defaultLabels: z.array(z.string()).optional(),
  defaultAssignees: z.array(z.string()).optional(),
});

// Client-side GitHub integration form schema (uses repository as "owner/repo" string)
export const githubIntegrationFormSchema = z.object({
  projectId: z.string(),
  personalAccessToken: z.string().optional(),
  repository: z.string().min(1, "Repository is required"),
  defaultLabels: z.string().optional(),
  defaultAssignees: z.string().optional(),
});

export const generateWebhookSecretSchema = z.object({
  projectId: z.string(),
});

// Widget Customization Schemas
export const widgetCustomizationSchema = z.object({
  projectId: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  backgroundColor: z.string(),
  fontFamily: z.string(),
  borderRadius: z.string(),
  buttonText: z.string(),
  buttonPosition: z.string(),
});

// Server-side widget customization schema (all fields optional for partial updates)
export const widgetCustomizationUpdateSchema = z.object({
  projectId: z.string(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  fontFamily: z.string().optional(),
  borderRadius: z.string().optional(),
  buttonText: z.string().optional(),
  buttonPosition: z.string().optional(),
});

// Widget Submit Schemas
export const widgetSubmitFormSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters.")
    .max(100, "Title must be at most 100 characters."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters.")
    .max(1000, "Description must be at most 1000 characters."),
  name: z.string().optional(),
  email: z.email("Invalid email address.").optional().or(z.literal("")),
});

export const widgetSubmitSchema = z.object({
  projectKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  screenshot: z.string(),
  annotations: z.string().optional(),
  userName: z.string().optional(),
  userEmail: z.email().optional().or(z.literal("")),
  url: z.string().optional(),
  userAgent: z.string().optional(),
});

// Widget Upload Schema
export const widgetUploadSchema = z.object({
  image: z.string().min(1, "Image data is required"),
});

// GitHub Issue Schema
export const closeIssueSchema = z.object({
  issueId: z.string(),
});

// Account Schema
export const unlinkAccountSchema = z.object({
  accountId: z.string(),
});
