import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "스쿨홀릭 - 학부모 커뮤니케이션 플랫폼",
  description: "알림장과 상담 예약을 한곳에서. 교사와 학부모를 위한 스마트 학교 커뮤니케이션 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
