import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Piano Lesson Manager",
    description: "ピアノ教室運営システム",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja" suppressHydrationWarning>
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#8b5cf6" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <link rel="apple-touch-icon" href="/icons/icon-192.png" />
            </head>
            <body className="antialiased bg-slate-950 text-slate-100">
                {children}
            </body>
        </html>
    );
}
