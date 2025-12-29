"use server";

import { put } from "@vercel/blob";
import { z } from "zod";

export async function uploadFont(data: FormData) {
  try {
    const fontFile = data.get("font") as File | null;

    if (!fontFile) {
      return {
        success: false,
        error: "Font file is required",
      };
    }

    // Validate file type
    const validTypes = [
      "font/woff",
      "font/woff2",
      "application/font-woff",
      "application/font-woff2",
      "application/x-font-ttf",
      "application/x-font-opentype",
      "font/ttf",
      "font/otf",
    ];

    const fileType = fontFile.type.toLowerCase();
    const fileName = fontFile.name.toLowerCase();
    const isValidType =
      validTypes.some((type) => fileType.includes(type)) ||
      fileName.endsWith(".woff") ||
      fileName.endsWith(".woff2") ||
      fileName.endsWith(".ttf") ||
      fileName.endsWith(".otf");

    if (!isValidType) {
      return {
        success: false,
        error: `Invalid font type. Supported types: woff, woff2, ttf, otf`,
      };
    }

    // Limit font size to 2MB
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (fontFile.size > maxSize) {
      return {
        success: false,
        error: "Font file size exceeds 2MB limit",
      };
    }

    // Convert file to buffer
    const arrayBuffer = await fontFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension
    const extension = fileName.includes(".woff2")
      ? "woff2"
      : fileName.includes(".woff")
        ? "woff"
        : fileName.includes(".ttf")
          ? "ttf"
          : fileName.includes(".otf")
            ? "otf"
            : "woff2"; // default

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `fonts/${timestamp}-${randomString}.${extension}`;

    // Determine content type
    const contentType =
      extension === "woff2"
        ? "font/woff2"
        : extension === "woff"
          ? "font/woff"
          : extension === "ttf"
            ? "font/ttf"
            : "font/otf";

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
    });

    return {
      success: true,
      url: blob.url,
      fileName: fontFile.name, // Return original filename
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid request data",
        details: error.format(),
      };
    }

    console.error("Error uploading font:", error);
    return {
      success: false,
      error: "Failed to upload font",
    };
  }
}
