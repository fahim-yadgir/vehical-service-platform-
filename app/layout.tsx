import "./globals.css";
import type { Metadata, Viewport } from "next";
import NativeShell from "../components/native/NativeShell";

export const metadata: Metadata = {
  title: "AutoServe | Vehicle Service Platform",
  description: "Role-based vehicle servicing booking platform frontend",
};

// viewport-fit=cover lets the page use the full screen; the safe-area CSS keeps content clear of
// the camera cut-out and the system bars. resizes-content shrinks the page when the keyboard opens.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {children}
        <NativeShell />
      </body>
    </html>
  );
}