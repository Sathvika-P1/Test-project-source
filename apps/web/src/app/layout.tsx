import type { Metadata } from "next";
import "./globals.css";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Shopping Website",
  description: "Shopping website web app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <div className="shell">
          <TopBar />
          <main className="container shell-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
