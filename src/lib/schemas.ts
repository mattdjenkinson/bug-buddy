import { z } from "zod";

// Domain validation regex: matches valid domain names (e.g., example.com, subdomain.example.com)
export const DOMAIN_REGEX =
  /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

// Project Schemas
export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional(),
  installationId: z.string().min(1, "GitHub App installation is required"),
  repository: z.string().min(1, "Repository is required"),
  allowedDomains: z
    .union([
      z.string(),
      z.array(
        z
          .string()
          .regex(
            DOMAIN_REGEX,
            "Invalid domain format. Please use format like example.com",
          ),
      ),
    ])
    .optional()
    .transform((value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      return value
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
    })
    .pipe(
      z.array(
        z
          .string()
          .regex(
            DOMAIN_REGEX,
            "Invalid domain format. Please use format like example.com",
          ),
      ),
    ),
  defaultLabels: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      return value
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);
    })
    .pipe(z.array(z.string())),
  defaultAssignees: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      return value
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
    })
    .pipe(z.array(z.string())),
});

export const updateProjectSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  allowedDomains: z
    .array(
      z
        .string()
        .regex(
          DOMAIN_REGEX,
          "Invalid domain format. Please use format like example.com",
        ),
    )
    .optional(),
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
  repositoryOwner: z.string(),
  repositoryName: z.string(),
  defaultLabels: z.array(z.string()).optional(),
  defaultAssignees: z.array(z.string()).optional(),
});

// Client-side GitHub integration form schema (uses repository as "owner/repo" string)
export const githubIntegrationFormSchema = z.object({
  projectId: z.string(),
  repository: z.string().min(1, "Repository is required"),
  defaultLabels: z.string().optional(),
  defaultAssignees: z.string().optional(),
});

// Widget Customization Schemas
export const widgetCustomizationSchema = z.object({
  projectId: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  fontFamily: z.string(),
  fontUrl: z.string().optional(),
  fontFileName: z.string().optional(),
  borderRadius: z.string(),
  buttonText: z.string(),
  buttonPosition: z.string(),
});

// Server-side widget customization schema (all fields optional for partial updates)
export const widgetCustomizationUpdateSchema = z.object({
  projectId: z.string(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  fontFamily: z.string().optional(),
  fontUrl: z.string().optional().nullable(),
  fontFileName: z.string().optional().nullable(),
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
  githubUsername: z
    .string()
    .min(1, "GitHub username must be at least 1 character")
    .max(39, "GitHub username must be at most 39 characters")
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
      "Invalid GitHub username format (alphanumeric and hyphens only, cannot start/end with hyphen)",
    )
    .optional()
    .or(z.literal("")),
});

export const widgetSubmitSchema = z.object({
  projectKey: z.string().min(1),
  secretKey: z.string().min(1, "Secret key is required"),
  title: z.string().min(1),
  description: z.string().min(1),
  screenshot: z.string(),
  annotations: z.string().optional(),
  userName: z.string().optional(),
  userEmail: z.email().optional().or(z.literal("")),
  githubUsername: z
    .string()
    .min(1, "GitHub username must be at least 1 character")
    .max(39, "GitHub username must be at most 39 characters")
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
      "Invalid GitHub username format (alphanumeric and hyphens only, cannot start/end with hyphen)",
    )
    .optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
  deviceInfo: z
    .object({
      deviceType: z.string().optional(),
      browser: z.string().optional(),
      screenSize: z
        .object({
          width: z.number(),
          height: z.number(),
        })
        .optional(),
      viewportSize: z
        .object({
          width: z.number(),
          height: z.number(),
        })
        .optional(),
      os: z.string().optional(),
      zoomLevel: z.number().optional(),
      pixelRatio: z.number().optional(),
    })
    .optional(),
});

// Widget Upload Schema
export const widgetUploadSchema = z.object({
  projectKey: z.string().min(1, "Project key is required"),
  secretKey: z.string().min(1, "Secret key is required"),
  image: z.string().min(1, "Image data is required"),
  url: z.string().optional(),
});

// Font Upload Schema
export const fontUploadSchema = z.object({
  font: z.instanceof(File, { message: "Font file is required" }),
});

// GitHub Issue Schema
export const closeIssueSchema = z.object({
  issueId: z.string(),
});

// Account Schema
export const unlinkAccountSchema = z.object({
  accountId: z.string(),
});
