import type { Metadata } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { NextNavProvider } from "@/experience/next-nav";

export const metadata: Metadata = {
  title: { default: "ChefOS", template: "%s · ChefOS" },
  description: "Kitchen management and food cost platform",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans antialiased">
        <NextNavProvider>{children}</NextNavProvider>
      </body>
    </html>
  );
}
