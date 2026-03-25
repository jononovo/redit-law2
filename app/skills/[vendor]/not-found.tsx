import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, XCircle } from "lucide-react";

export default function VendorNotFound() {
  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans">
      <Nav />
      <main className="py-32 text-center">
        <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-neutral-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-neutral-900 mb-3">Vendor Not Found</h1>
        <p className="text-neutral-500 font-medium mb-6">
          No procurement skill exists for this vendor.
        </p>
        <Link href="/skills">
          <Button className="rounded-full" data-testid="button-back-to-catalog">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Catalog
          </Button>
        </Link>
      </main>
      <Footer />
    </div>
  );
}
