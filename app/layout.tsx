import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "AutoServe | Vehicle Service Platform",
  description: "Role-based vehicle servicing booking platform frontend",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
