import { Geist, Geist_Mono, Inter, Instrument_Serif } from "next/font/google";

/**
 * The families the app is typeset in, declared once.
 *
 * `layout.tsx` puts these variables on `<html>`. `global-error.tsx` has to put
 * them on its own document, because it replaces the root layout entirely: with
 * no layout there are no variables, and every `font-sans` / `font-display`
 * utility would quietly fall back to the browser's default. One declaration
 * keeps the two documents on the same typography.
 */

export const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
