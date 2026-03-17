import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Collecto",
  description: "Gather inspiration in seconds — extract images, colors, and typography from any website.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
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
        <div className="min-h-screen main-bg text-slate-800 flex overflow-hidden p-4 gap-4">
          <Sidebar />
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <Navbar />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
