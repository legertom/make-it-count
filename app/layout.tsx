import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const TITLE = "Make It Count";
const TAGLINE = "Use AI where it pays off";
const DESCRIPTION =
  "A ten-minute course for everyone at Clever on getting real work out of Claude and Gemini: pick the right tool, keep the chat focused, and use the right amount of horsepower. Sign in with your Clever Google account.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s · ${TITLE}` },
  description: DESCRIPTION,
  applicationName: TITLE,
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: `${TITLE}: ${TAGLINE}`,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE}: ${TAGLINE}`,
    description: DESCRIPTION,
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
