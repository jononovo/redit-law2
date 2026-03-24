"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Star,
  X,
  Check,
} from "lucide-react";

interface ShippingAddress {
  id: number;
  ownerUid: string;
  label: string | null;
  isDefault: boolean;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
  email: string | null;
}

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

const EMPTY_FORM = {
  label: "",
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  phone: "",
  email: "",
  isDefault: false,
};

type AddressForm = typeof EMPTY_FORM;

function AddressFormFields({
  form,
  setForm,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  form: AddressForm;
  setForm: (fn: (prev: AddressForm) => AddressForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.line1.trim()) e.line1 = "Address line 1 is required";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.state) e.state = "State is required";
    if (!form.postalCode.trim()) e.postalCode = "ZIP code is required";
    else if (!/^\d{5}(-\d{4})?$/.test(form.postalCode.trim()))
      e.postalCode = "Invalid ZIP format (e.g., 12345 or 12345-6789)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (validate()) onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-neutral-200 rounded-xl p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Label (optional)</Label>
          <Input
            placeholder="e.g. Home, Office"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="text-sm"
            data-testid="input-address-label"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Full Name *</Label>
          <Input
            placeholder="John Doe"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={`text-sm ${errors.name ? "border-red-300" : ""}`}
            data-testid="input-address-name"
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Address Line 1 *</Label>
        <Input
          placeholder="123 Main St"
          value={form.line1}
          onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
          className={`text-sm ${errors.line1 ? "border-red-300" : ""}`}
          data-testid="input-address-line1"
        />
        {errors.line1 && <p className="text-xs text-red-500">{errors.line1}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Address Line 2 (optional)</Label>
        <Input
          placeholder="Apt, Suite, Unit"
          value={form.line2}
          onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
          className="text-sm"
          data-testid="input-address-line2"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">City *</Label>
          <Input
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className={`text-sm ${errors.city ? "border-red-300" : ""}`}
            data-testid="input-address-city"
          />
          {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">State *</Label>
          <select
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            className={`w-full h-9 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
              errors.state ? "border-red-300" : "border-neutral-200"
            }`}
            data-testid="select-address-state"
          >
            <option value="">Select state</option>
            {US_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">ZIP Code *</Label>
          <Input
            placeholder="12345"
            value={form.postalCode}
            onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
            className={`text-sm ${errors.postalCode ? "border-red-300" : ""}`}
            data-testid="input-address-zip"
          />
          {errors.postalCode && <p className="text-xs text-red-500">{errors.postalCode}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Phone (optional)</Label>
          <Input
            placeholder="+1 555-123-4567"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="text-sm"
            data-testid="input-address-phone"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Email (optional)</Label>
          <Input
            type="email"
            placeholder="orders@example.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="text-sm"
            data-testid="input-address-email"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          data-testid="button-address-save"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
          {submitLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
          data-testid="button-address-cancel"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: ShippingAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);

  return (
    <div
      className={`bg-neutral-50 rounded-xl p-4 ${
        address.isDefault ? "ring-2 ring-primary/30" : ""
      }`}
      data-testid={`card-address-${address.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            {address.label && (
              <span className="text-xs font-medium text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full">
                {address.label}
              </span>
            )}
            {address.isDefault && (
              <span className="text-xs font-medium text-primary flex items-center gap-1" data-testid={`badge-default-${address.id}`}>
                <Star className="w-3 h-3 fill-primary" />
                Default
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-neutral-900" data-testid={`text-address-name-${address.id}`}>
            {address.name}
          </p>
          <p className="text-sm text-neutral-600" data-testid={`text-address-line-${address.id}`}>
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
          </p>
          <p className="text-sm text-neutral-600">
            {address.city}, {address.state} {address.postalCode}
          </p>
          {(address.phone || address.email) && (
            <p className="text-xs text-neutral-400 pt-0.5">
              {[address.phone, address.email].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-3">
          {!address.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSettingDefault(true);
                onSetDefault();
              }}
              disabled={settingDefault}
              className="text-neutral-400 hover:text-primary"
              data-testid={`button-set-default-address-${address.id}`}
            >
              {settingDefault ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Star className="w-4 h-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-neutral-400 hover:text-neutral-700"
            data-testid={`button-edit-address-${address.id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDeleting(true);
              onDelete();
            }}
            disabled={deleting}
            className="text-red-400 hover:text-red-600 hover:bg-red-50"
            data-testid={`button-delete-address-${address.id}`}
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ShippingAddressManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AddressForm>({ ...EMPTY_FORM });

  const { data, isLoading } = useQuery<{ addresses: ShippingAddress[] }>({
    queryKey: ["shipping-addresses"],
    queryFn: async () => {
      const res = await fetch("/api/v1/shipping-addresses");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/v1/shipping-addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Record<string, unknown> }) => {
      const res = await fetch(`/api/v1/shipping-addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/v1/shipping-addresses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/v1/shipping-addresses/${id}/set-default`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to set default");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-addresses"] });
    },
  });

  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(addr: ShippingAddress) {
    setForm({
      label: addr.label || "",
      name: addr.name,
      line1: addr.line1,
      line2: addr.line2 || "",
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      phone: addr.phone || "",
      email: addr.email || "",
      isDefault: addr.isDefault,
    });
    setEditingId(addr.id);
    setShowForm(true);
  }

  function handleSubmit() {
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      line1: form.line1.trim(),
      line2: form.line2.trim() || null,
      city: form.city.trim(),
      state: form.state,
      postalCode: form.postalCode.trim(),
      country: form.country,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      label: form.label.trim() || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const addresses = data?.addresses || [];
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-md font-bold text-neutral-900">Shipping Addresses</h3>
            <p className="text-xs text-neutral-500">Saved addresses for bot purchases and order fulfillment</p>
          </div>
        </div>
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setForm({ ...EMPTY_FORM });
              setEditingId(null);
              setShowForm(true);
            }}
            className="gap-1.5 text-sm"
            data-testid="button-add-address"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Address
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-neutral-400 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading addresses...
        </div>
      ) : (
        <div className="space-y-3 pl-7">
          {showForm && (
            <AddressFormFields
              form={form}
              setForm={setForm}
              onSubmit={handleSubmit}
              onCancel={resetForm}
              isPending={isPending}
              submitLabel={editingId ? "Update Address" : "Save Address"}
            />
          )}

          {addresses.length > 0 ? (
            addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                address={addr}
                onEdit={() => startEdit(addr)}
                onDelete={() => deleteMutation.mutate(addr.id)}
                onSetDefault={() => setDefaultMutation.mutate(addr.id)}
              />
            ))
          ) : !showForm ? (
            <div className="bg-neutral-50 rounded-xl p-6 text-center" data-testid="no-shipping-addresses">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-neutral-400" />
              </div>
              <p className="text-sm text-neutral-500">
                No shipping addresses saved. Add one for faster checkout.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
