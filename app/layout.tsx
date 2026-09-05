import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SWEAP CALABARZON Member Database",
  description: "DSWD FO IV-A SWEAP Member Records Platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t==='dark');}catch(e){document.documentElement.classList.remove('dark');}})();`
          }}
        />
        {children}
      </body>
    </html>
  );
}
