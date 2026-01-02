"use server";

import { widgetUploadSchema } from "@/lib/schemas";
import {
  validateDomainForAction,
  validateSecretKeyForAction,
} from "@/lib/widget-api-helpers";
import { put } from "@vercel/blob";
import { z } from "zod";

export async function uploadWidgetImage(data: {
  projectKey: string;
  secretKey: string;
  image: string;
}) {
  try {
    const validated = widgetUploadSchema.parse(data);
    const { image, projectKey, secretKey } = validated;

    // Validate domain first (if configured)
    const domainValidation = await validateDomainForAction(projectKey);
    if (!domainValidation.isValid) {
      return {
        success: false,
        error: domainValidation.error || "Domain not allowed",
      };
    }

    // Validate secret key
    const validation = await validateSecretKeyForAction(projectKey, secretKey);
    if (!validation.isValid) {
      return {
        success: false,
        error: "Invalid secret key",
      };
    }

    // Check if it's a base64 data URL
    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return {
        success: false,
        error: "Invalid image format. Expected base64 data URL",
      };
    }

    const [, imageType, base64Data] = base64Match;
    const validTypes = ["png", "jpeg", "jpg", "webp"];
    if (!validTypes.includes(imageType.toLowerCase())) {
      return {
        success: false,
        error: `Invalid image type. Supported types: ${validTypes.join(", ")}`,
      };
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `screenshots/${timestamp}-${randomString}.${imageType}`;

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: `image/${imageType}`,
    });

    return {
      success: true,
      url: blob.url,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format(),
      };
    }

    console.error("Error uploading image:", error);
    return {
      success: false,
      error: "Failed to upload image",
    };
  }
}
