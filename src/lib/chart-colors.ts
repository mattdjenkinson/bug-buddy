"use client";

import * as React from "react";

// Convert RGB string (e.g., "rgb(123, 45, 67)") to hex
export function rgbToHex(rgb: string): string {
  const match = rgb.match(/\d+/g);
  if (match && match.length >= 3) {
    const r = parseInt(match[0]);
    const g = parseInt(match[1]);
    const b = parseInt(match[2]);
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  }
  return "#9d4edd"; // Fallback
}

// Convert OKLCH to hex using browser's color conversion
export function oklchToHex(oklch: string): string {
  if (typeof window === "undefined") return "#9d4edd";

  const div = document.createElement("div");
  div.style.color = oklch;
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  document.documentElement.appendChild(div);
  const computed = window.getComputedStyle(div).color;
  document.documentElement.removeChild(div);

  return rgbToHex(computed);
}

// Convert hex to rgba with opacity
export function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Generate colors using primary color with varying opacity
export function generateChartColors(
  primaryHex: string,
  count: number = 4,
): string[] {
  const colors: string[] = [];
  // Generate colors with decreasing opacity: 1.0, 0.75, 0.5, 0.35
  for (let i = 0; i < count; i++) {
    const opacity = 1.0 - i * 0.25;
    colors.push(hexToRgba(primaryHex, Math.max(0.3, opacity)));
  }
  return colors;
}

// Get primary color from CSS and generate colors with different opacities
export function useChartColors(): string[] {
  const [colors, setColors] = React.useState<string[]>([
    "#9d4edd",
    "#9d4edd",
    "#9d4edd",
    "#9d4edd",
  ]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Get primary color from CSS variable
    const root = document.documentElement;
    const primaryColor = getComputedStyle(root)
      .getPropertyValue("--primary")
      .trim();

    // Convert to hex
    const primaryHex = oklchToHex(primaryColor);
    const generatedColors = generateChartColors(primaryHex, 4);
    setColors(generatedColors);
  }, []);

  return colors;
}
