"use server";

import { del } from "@vercel/blob";

export async function deleteFont(fontUrl: string) {
  try {
    if (!fontUrl) {
      return {
        success: false,
        error: "Font URL is required",
      };
    }

    // Delete from Vercel Blob
    await del(fontUrl);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting font:", error);
    return {
      success: false,
      error: "Failed to delete font from storage",
    };
  }
}
