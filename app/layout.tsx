import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Make It Count",
  description: "Clever's short course on using AI on purpose.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
