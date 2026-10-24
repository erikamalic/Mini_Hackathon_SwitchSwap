import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ShiftSwap — campus shift marketplace (testnet)",
  description:
    "P2P campus shift-swapping and micro-job marketplace with on-chain XLM escrow, built on Paiflow",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
