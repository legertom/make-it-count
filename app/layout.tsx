import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const TITLE = "Make It Count";
const TAGLINE = "Getting the most out of your Claude budget";
const DESCRIPTION =
  "A fifteen-minute course for everyone at Clever on getting real work out of Claude and Gemini: pick the right tool, keep the chat focused, use the right amount of horsepower, and know how to ask for more. Sign in with your Clever Google account.";

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
