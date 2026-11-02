import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CINEVERSE | Interactive 3D Cinema Booking & Seat Preview Platform",
  description:
    "Explore cinema auditoriums in interactive 3D, preview the exact screen perspective from any seat, and watch synchronized trailers before booking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-cinema-obsidian text-white antialiased">
        {children}
      </body>
    </html>
  );
}
