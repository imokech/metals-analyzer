import type { Metadata } from "next";
import { Vazirmatn, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";
import Nav from "./components/Nav";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

// Faux-serif Persian display face — traditional Naskh strokes stand in for
// Steep's editorial serif while staying legible in Persian.
const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "تحلیلگر بازار فلزات",
  description:
    "رصد و تحلیل معاملات فلزات بورس کالا، قیمت‌های جهانی و روند تاریخی بازار",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${naskh.variable}`}>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <Nav />
        {children}
      </body>
    </html>
  );
}
