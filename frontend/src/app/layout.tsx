import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rappi · Availability Dashboard",
  description: "AI-powered dashboard + chatbot over store availability data",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
