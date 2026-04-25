import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SWEAP CALABARZON Member Database",
  description: "DSWD FO IV-A SWEAP Member Records Platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
