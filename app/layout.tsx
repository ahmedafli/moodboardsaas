import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "DoubleA interior design studio",
  description: "Gather inspiration in seconds — extract images, colors, and typography from any website.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/doublea.jpg", type: "image/jpeg", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/doublea.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/doublea.jpg" type="image/jpeg" sizes="any" />
        <link rel="apple-touch-icon" href="/doublea.jpg" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@500,600,700&f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}

