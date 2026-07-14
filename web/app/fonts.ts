import localFont from "next/font/local";
import { DM_Sans, DM_Mono } from "next/font/google";

export const clashDisplay = localFont({
  src: [
    { path: "./fonts/ClashDisplay-Extralight.otf", weight: "200", style: "normal" },
    { path: "./fonts/ClashDisplay-Light.otf", weight: "300", style: "normal" },
    { path: "./fonts/ClashDisplay-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/ClashDisplay-Medium.otf", weight: "500", style: "normal" },
    { path: "./fonts/ClashDisplay-Semibold.otf", weight: "600", style: "normal" },
    { path: "./fonts/ClashDisplay-Bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-clash",
  display: "swap",
});

export const instrumentSerif = localFont({
  src: [
    { path: "./fonts/InstrumentSerif-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/InstrumentSerif-Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});
