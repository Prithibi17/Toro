import type { Metadata } from "next";import "./globals.css";
export const metadata:Metadata={title:{default:"Toro — Run your company",template:"%s · Toro"},description:"A secure multi-company ERP workspace",manifest:"/manifest.webmanifest"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body>{children}</body></html>}
