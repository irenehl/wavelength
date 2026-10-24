import type { Metadata, Viewport } from "next";
import { Alan_Sans, DM_Sans } from "next/font/google";
import Script from "next/script";
import { SiteFooter } from "@/components/brand";
import { LocaleProvider } from "@/components/locale";
import "./globals.css";

const alanSans = Alan_Sans({
  subsets: ["latin"],
  variable: "--font-alan-sans",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Puente · Ai Labs",
  description:
    "Live interpretation for one event, by Ai Labs. One translation per language, shared by the room. Interpretación en vivo para un evento.",
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning className={`${alanSans.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col">
        <Script id="puente-locale" strategy="beforeInteractive">
          {`try{var s=localStorage.getItem("puente-locale");var n=s==="en"||s==="es"?s:(navigator.language||"").toLowerCase().indexOf("en")===0?"en":"es";document.documentElement.lang=n}catch(e){}`}
        </Script>
        <LocaleProvider>
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
        </LocaleProvider>
      </body>
    </html>
  );
}
