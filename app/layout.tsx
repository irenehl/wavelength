import type { Metadata } from "next";
import { Newsreader, Outfit } from "next/font/google";
import Script from "next/script";
import { LocaleProvider } from "@/components/locale";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: "Puente",
  description:
    "Live interpretation for one event. One translation per language, shared by the room. Interpretación en vivo para un evento.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning className={`${outfit.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col">
        <Script id="puente-locale" strategy="beforeInteractive">
          {`try{var s=localStorage.getItem("puente-locale");var n=s==="en"||s==="es"?s:(navigator.language||"").toLowerCase().indexOf("en")===0?"en":"es";document.documentElement.lang=n}catch(e){}`}
        </Script>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
