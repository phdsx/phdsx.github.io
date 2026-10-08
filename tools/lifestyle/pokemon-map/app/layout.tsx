import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "宝可梦视野地图",
  description: "根据地图视野与纽约市边界选择宝可梦数据源，提供统一筛选和访问状态。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
