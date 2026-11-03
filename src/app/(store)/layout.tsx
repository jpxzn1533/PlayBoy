import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { Toaster } from "@/components/store/toaster";
import { VisitTracker } from "@/components/store/visit-tracker";
import { PurchasePopup } from "@/components/store/purchase-popup";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <Toaster />
      <VisitTracker />
      <PurchasePopup />
    </div>
  );
}
