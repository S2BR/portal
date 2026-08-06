import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/**
 * The social share card for the landing (also the site-wide default og:image / twitter:image).
 * A dark brand card — the S2BR logo, tagline, and a colorful launch date on the left, the Brazil
 * flag photo on the right — in the site's Plus Jakarta Sans. Runs on the Node runtime so it can
 * read the fonts + images off disk.
 */
export const runtime = "nodejs";
export const alt = "S2BR — Bringing communities together";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const asset = (path: string) => readFileSync(join(process.cwd(), path));
const dataUri = (path: string, mime: string) =>
  `data:${mime};base64,${asset(path).toString("base64")}`;

export default function OpengraphImage() {
  const logo = dataUri("public/s2br-logo.png", "image/png");
  const flag = dataUri("public/images/side_image_01.jpg", "image/jpeg");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#0f1311",
        color: "#ffffff",
        fontFamily: "Plus Jakarta Sans",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          flex: 1,
          padding: 76,
        }}
      >
        <img src={logo} width={72} height={72} alt="" />
        <div
          style={{
            display: "flex",
            fontSize: 74,
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          Bringing communities together.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 400,
            color: "#a7b0ac",
            lineHeight: 1.3,
            maxWidth: 600,
          }}
        >
          Your Brazilian community, wherever life takes you.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 600,
            marginTop: 8,
            backgroundImage:
              "linear-gradient(90deg, #14d67a, #3ae08f, #ffc72c, #ff8a3c)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Launching September 7, 2026
        </div>
      </div>
      <img
        src={flag}
        width={430}
        height={630}
        style={{ objectFit: "cover" }}
        alt=""
      />
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Plus Jakarta Sans",
          data: asset("public/fonts/PlusJakartaSans-Regular.ttf"),
          weight: 400,
          style: "normal",
        },
        {
          name: "Plus Jakarta Sans",
          data: asset("public/fonts/PlusJakartaSans-SemiBold.ttf"),
          weight: 600,
          style: "normal",
        },
        {
          name: "Plus Jakarta Sans",
          data: asset("public/fonts/PlusJakartaSans-Bold.ttf"),
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
}
