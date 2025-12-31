import { existsSync, readFileSync } from "fs";
import { NextResponse } from "next/server";
import { join } from "path";

export async function GET() {
  try {
    // Try multiple possible paths for Vercel compatibility
    const possiblePaths = [
      join(process.cwd(), "public", "widget-manifest.json"), // Standard path
      join(
        process.cwd(),
        ".next",
        "server",
        "app",
        "public",
        "widget-manifest.json",
      ), // Vercel build path
      join(process.cwd(), "widget-manifest.json"), // Root fallback
    ];

    let manifestPath: string | null = null;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        manifestPath = path;
        break;
      }
    }

    if (!manifestPath) {
      // Manifest doesn't exist, return fallback
      return NextResponse.json({
        version: null,
        filename: "widget.js",
        size: 0,
        originalSize: 0,
        createdAt: null,
      });
    }

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    return NextResponse.json(manifest);
  } catch (error) {
    console.error("Error getting widget version:", error);
    // If manifest doesn't exist or can't be read, fallback to widget.js
    return NextResponse.json({
      version: null,
      filename: "widget.js",
      size: 0,
      originalSize: 0,
      createdAt: null,
    });
  }
}
