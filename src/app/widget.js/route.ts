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

    let widgetFilename = "widget.js"; // Default fallback

    if (manifestPath) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        if (manifest.filename) {
          widgetFilename = manifest.filename;
        }
      } catch {
        // If manifest can't be read, fall back to widget.js
      }
    }

    // Read the widget file
    const widgetPaths = [
      join(process.cwd(), "public", widgetFilename),
      join(process.cwd(), widgetFilename),
    ];

    let widgetPath: string | null = null;
    for (const path of widgetPaths) {
      if (existsSync(path)) {
        widgetPath = path;
        break;
      }
    }

    if (!widgetPath) {
      return new NextResponse("Widget file not found", { status: 404 });
    }

    const widgetContent = readFileSync(widgetPath, "utf8");

    // Return the widget with appropriate headers
    return new NextResponse(widgetContent, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=31536000, immutable", // Cache for 1 year since filename includes hash
      },
    });
  } catch (error) {
    console.error("Error serving widget:", error);
    return new NextResponse("Error serving widget", { status: 500 });
  }
}
