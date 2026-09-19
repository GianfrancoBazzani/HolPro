import { Instrument_Serif, Manrope } from "next/font/google";
export const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const sans = Manrope({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
});
