"use client";

import { ArrowRight, ArrowLeft, CreditCard, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { wt } from "@/lib/wizard-typography";
import { StepHeader } from "../step-header";

interface BillingAddressProps {
  address: string;
  setAddress: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  state: string;
  setState: (v: string) => void;
  zip: string;
  setZip: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  showCountryPicker: boolean;
  setShowCountryPicker: (v: boolean) => void;
  addressErrors: { address?: boolean; city?: boolean; zip?: boolean };
  setAddressErrors: (v: { address?: boolean; city?: boolean; zip?: boolean }) => void;
  onBack: () => void;
  onNext: () => void;
}

export function BillingAddress({
  address, setAddress,
  city, setCity,
  state, setState,
  zip, setZip,
  country, setCountry,
  showCountryPicker, setShowCountryPicker,
  addressErrors, setAddressErrors,
  onBack, onNext,
}: BillingAddressProps) {
  return (
    <div className="space-y-6" data-testid="r5-step-address">
      <StepHeader icon={CreditCard} iconBg="bg-indigo-50" iconColor="text-indigo-600" title="Billing Address" />

      <div className="space-y-4">
        <div>
          <Label htmlFor="r5-address">Street Address</Label>
          <Input
            id="r5-address"
            placeholder="123 Main St"
            value={address}
            onChange={(e) => { setAddress(e.target.value); setAddressErrors({ ...addressErrors, address: false }); }}
            className={addressErrors.address ? "form-field-error" : ""}
            data-testid="input-r5-address"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="r5-city">City</Label>
            <Input id="r5-city" placeholder="New York" value={city} onChange={(e) => { setCity(e.target.value); setAddressErrors({ ...addressErrors, city: false }); }} className={addressErrors.city ? "form-field-error" : ""} data-testid="input-r5-city" />
          </div>
          <div>
            <Label htmlFor="r5-state">State</Label>
            <Input id="r5-state" placeholder="NY" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))} data-testid="input-r5-state" />
          </div>
          <div>
            <Label htmlFor="r5-zip">ZIP</Label>
            <Input id="r5-zip" placeholder="10001" value={zip} onChange={(e) => { setZip(e.target.value.replace(/\D/g, "").slice(0, 10)); setAddressErrors({ ...addressErrors, zip: false }); }} className={addressErrors.zip ? "form-field-error" : ""} data-testid="input-r5-zip" />
          </div>
        </div>

        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setShowCountryPicker(!showCountryPicker)}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors mt-1"
            data-testid="button-r5-country-toggle"
          >
            Not United States?
            <ChevronDown className={`w-3 h-3 transition-transform ${showCountryPicker ? "rotate-180" : ""}`} />
          </button>
          {showCountryPicker && (
            <div className="mt-2 w-full">
              <Label htmlFor="r5-country">Country</Label>
              <select
                id="r5-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                data-testid="select-r5-country"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="JP">Japan</option>
                <option value="BR">Brazil</option>
                <option value="IN">India</option>
                <option value="MX">Mexico</option>
                <option value="IT">Italy</option>
                <option value="ES">Spain</option>
                <option value="NL">Netherlands</option>
                <option value="SE">Sweden</option>
                <option value="CH">Switzerland</option>
                <option value="SG">Singapore</option>
                <option value="KR">South Korea</option>
                <option value="NZ">New Zealand</option>
                <option value="IE">Ireland</option>
                <option value="NO">Norway</option>
                <option value="DK">Denmark</option>
                <option value="FI">Finland</option>
                <option value="AT">Austria</option>
                <option value="BE">Belgium</option>
                <option value="PT">Portugal</option>
                <option value="PL">Poland</option>
                <option value="IL">Israel</option>
                <option value="AE">United Arab Emirates</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className={`flex-1 ${wt.secondaryButton} gap-2`} data-testid="button-r5-step5-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={onNext} className={`flex-1 ${wt.primaryButton} gap-2`} data-testid="button-r5-step5-next">
          Next <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
