import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "E-Learning Content Validator | Công cụ Validate Nội dung",
  description:
    "Công cụ validate và hiển thị nội dung LaTeX cho đội Content. Hỗ trợ xem trước và kiểm tra câu hỏi (Questions) và thẻ ghi nhớ (Flashcards) với định dạng LaTeX được render chính xác.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
