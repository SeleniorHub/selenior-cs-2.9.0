import type { Metadata } from "next";
import { clashDisplay, instrumentSerif, dmSans, dmMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Selenior CS",
  description: "Selenior CS Dashboard",
  icons: { icon: "/assets/favicon.png" },
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('selenior_theme');if(t&&t!=='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${clashDisplay.variable} ${instrumentSerif.variable} ${dmSans.variable} ${dmMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
