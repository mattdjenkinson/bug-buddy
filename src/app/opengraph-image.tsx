import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Image metadata
export const alt = "Bug Buddy";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function Image() {
  console.log("Generating opengraph image");
  // Font loading, process.cwd() is Next.js project directory
  const geistMono = await readFile(
    join(process.cwd(), "public/GeistMono-Regular.ttf"),
  );
  const logoData = await readFile(
    join(process.cwd(), "public/hexagon-icon.svg"),
    "base64",
  );

  return new ImageResponse(
    // ImageResponse JSX element
    <div
      style={{
        fontSize: 128,
        background: "white",
        width: "100%",
        height: "100%",
        display: "flex",
        gap: "2rem",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={`data:image/svg+xml;base64,${logoData}`}
        height={128}
        width={128}
        alt="Bug Buddy Logo"
      />{" "}
      <p>Bug Buddy</p>
    </div>,
    // ImageResponse options
    {
      // For convenience, we can re-use the exported opengraph-image
      // size config to also set the ImageResponse's width and height.
      ...size,
      fonts: [
        {
          name: "Geist Mono",
          data: geistMono,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
