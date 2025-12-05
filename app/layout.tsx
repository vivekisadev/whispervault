import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Whisper Vault - Anonymous Campus Confession & Chat",
  description: "Share anonymous confessions and chat with strangers on your campus. A safe space for students to express themselves freely without judgment.",
  keywords: ["anonymous chat", "campus confessions", "student community", "whisper vault", "stranger chat", "college life"],
  authors: [{ name: "Vivek" }],
  openGraph: {
    title: "Whisper Vault - Anonymous Campus Confession & Chat",
    description: "Share anonymous confessions and chat with strangers on your campus. Join the community today!",
    type: "website",
    locale: "en_US",
    siteName: "Whisper Vault",
  },
  twitter: {
    card: "summary_large_image",
    title: "Whisper Vault - Anonymous Campus Confession & Chat",
    description: "Share anonymous confessions and chat with strangers on your campus.",
    creator: "@vivekisadev",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: "/vault-logo.svg",
    shortcut: "/vault-logo.svg",
    apple: "/vault-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
