"use client";

import { CreditCard } from "lucide-react";
import type { CardBrand } from "@/lib/card/card-brand";

export function BrandLogo({ brand }: { brand: CardBrand }) {
  const size = "w-14 h-10";
  const base = `${size} flex items-center justify-center rounded-md transition-all duration-300`;

  switch (brand) {
    case "visa":
      return (
        <div className={`${base} bg-white`}>
          <span className="text-[#1A1F71] font-extrabold italic text-lg tracking-tight" style={{ fontFamily: "Arial, sans-serif" }}>VISA</span>
        </div>
      );
    case "mastercard":
      return (
        <div className={`${base} bg-transparent`}>
          <div className="relative w-10 h-7">
            <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-[#EB001B] opacity-90" />
            <div className="absolute right-0 top-0 w-7 h-7 rounded-full bg-[#F79E1B] opacity-90" />
          </div>
        </div>
      );
    case "amex":
      return (
        <div className={`${base} bg-[#006FCF]`}>
          <span className="text-white font-bold text-[10px] tracking-wider">AMEX</span>
        </div>
      );
    case "discover":
      return (
        <div className={`${base} bg-white`}>
          <span className="text-[#FF6000] font-bold text-xs tracking-wide">DISCOVER</span>
        </div>
      );
    case "jcb":
      return (
        <div className={`${base} bg-white`}>
          <span className="text-[#0B4EA2] font-bold text-sm">JCB</span>
        </div>
      );
    case "diners":
      return (
        <div className={`${base} bg-white`}>
          <span className="text-[#004A97] font-bold text-[9px] tracking-tight">DINERS</span>
        </div>
      );
    default:
      return (
        <div className={`${base} bg-white/10`}>
          <CreditCard className="w-6 h-6 text-white/50" />
        </div>
      );
  }
}
