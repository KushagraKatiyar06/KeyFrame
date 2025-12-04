import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KeyFrame AI Video Generator", 
  description: "AI-Powered Short Video Generator MVP", 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
  
>      {children}
      </body>
    </html>
  );
}