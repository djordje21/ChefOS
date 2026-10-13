import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ChefOS", template: "%s · ChefOS" },
  description: "Kitchen management and food cost platform",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
