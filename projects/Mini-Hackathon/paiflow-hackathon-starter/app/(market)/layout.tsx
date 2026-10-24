import { MarketProvider } from "@/lib/market/react";
import { Nav } from "@/components/nav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MarketProvider>
      <Nav />
      <main>{children}</main>
    </MarketProvider>
  );
}
