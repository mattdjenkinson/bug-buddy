import QueryProvider from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bug Buddy",
  description: "Bug Buddy is a platform for reporting and tracking bugs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Bud Buddy Widget */}
        <Script
          src="https://bugbuddy.dev/widget.js"
          data-project-key="bb_d26611187cc91eb17a65d0975c42a38b23208c34e1a18ad38d583789db02c568"
          data-app-url="https://bugbuddy.dev"
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="bug-buddy-theme"
        >
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
