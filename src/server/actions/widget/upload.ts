"use server";

import { widgetUploadSchema } from "@/lib/schemas";
import { put } from "@vercel/blob";
import { z } from "zod";

export async function uploadImage(data: z.infer<typeof widgetUploadSchema>) {
  try {
    const validated = widgetUploadSchema.parse(data);
    const { image } = validated;

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

    // Limit image size to 500KB
    const maxSize = 500 * 1024; // 500KB
    if (buffer.length > maxSize) {
      return {
        success: false,
        error: "Image size exceeds 500KB limit",
      };
    }

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
