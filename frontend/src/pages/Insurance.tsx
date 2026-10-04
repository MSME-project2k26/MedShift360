import React, { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Copy, Pencil, Plus, ShieldCheck, ShieldPlus, Info } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/BottomNav";
import { api, errorMessage } from "@/lib/api";
import type { InsuranceFields, ProfileResult } from "@/types/api";

import "../App.css";

const NOT_ADDED = "Not added";

/** "12345678901234" -> "12-3456-7890-1234" (ABHA card format) */
const formatAbha = (abha: string) => abha.replace(/^(\d{2})(\d{4})(\d{4})(\d{4})$/, "$1-$2-$3-$4");

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context); nothing to do
    }
  };
  return (
    <button type="button" onClick={copy} aria-label={`Copy ${label}`} className="p-1.5 rounded-lg cursor-pointer hover:bg-white/15">
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

function DetailRow({ label, value, copyLabel }: { label: string; value: string | null; copyLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1 font-medium text-right">
        {value ?? <span className="text-muted-foreground font-normal">{NOT_ADDED}</span>}
        {value && copyLabel && (
          <span className="text-muted-foreground"><CopyButton value={value} label={copyLabel} /></span>
        )}
      </span>
    </div>
  );
}

const EMPTY_FORM = { insuranceProvider: "", insurancePolicyNumber: "", abhaNumber: "", pmjayId: "" };
type FormState = typeof EMPTY_FORM;

const Insurance: React.FC = () => {
  const [data, setData] = useState<ProfileResult | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    api.getProfile().then(setData).catch((err) => setLoadError(errorMessage(err)));
  }, []);

  if (!data) {
    return (
      <div className="whole-container flex flex-col justify-center items-center">
        {loadError ? <p className="form-error">{loadError}</p> : <Spinner className="size-12 text-brand" />}
        <BottomNav />
      </div>
    );
  }

  const { user, profile } = data;
  const hasPolicy = Boolean(profile.insuranceProvider || profile.insurancePolicyNumber);

  const openEditor = () => {
    setForm({
      insuranceProvider: profile.insuranceProvider ?? "",
      insurancePolicyNumber: profile.insurancePolicyNumber ?? "",
      abhaNumber: profile.abhaNumber ?? "",
      pmjayId: profile.pmjayId ?? "",
    });
    setSaveError("");
    setEditing(true);
  };

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    // Empty fields clear the value on the server
    const patch = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim() || null]),
    ) as InsuranceFields;
    try {
      setData(await api.updateProfile(patch));
      setEditing(false);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="whole-container pb-28!">
      <div className="flex items-center justify-between pb-5">
        <div>
          <h1 className="font-semibold text-lg">Insurance</h1>
          <p className="text-sm text-muted-foreground">Your health cover and government IDs</p>
        </div>
        {hasPolicy && (
          <button
            type="button"
            onClick={openEditor}
            aria-label="Edit insurance"
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center cursor-pointer"
          >
            <Pencil size={18} />
          </button>
        )}
      </div>

      {hasPolicy ? (
        /* Policy card */
        <div className="relative overflow-hidden rounded-2xl p-5 text-white bg-linear-to-br from-brand to-brand-strong shadow-lg shadow-brand/25">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -right-4 -bottom-16 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <ShieldCheck size={20} /> {profile.insuranceProvider ?? "Health insurance"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">Health</span>
          </div>

          <p className="relative text-xs text-white/70 mt-6">Policy number</p>
          <div className="relative flex items-center gap-1">
            <p className="text-xl font-semibold tracking-wider">{profile.insurancePolicyNumber ?? "—"}</p>
            {profile.insurancePolicyNumber && <CopyButton value={profile.insurancePolicyNumber} label="policy number" />}
          </div>

          <p className="relative text-xs text-white/70 mt-4">Policy holder</p>
          <p className="relative font-medium">{user.fullName}</p>
        </div>
      ) : (
        /* Empty state */
        <div className="rounded-2xl border-2 border-dashed border-border p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-brand-soft text-brand flex items-center justify-center">
            <ShieldPlus size={26} />
          </div>
          <p className="font-semibold mt-3">No insurance added</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your policy so hospitals can process admissions faster.
          </p>
          <button type="button" onClick={openEditor} className="signup-btn flex items-center justify-center gap-2">
            <Plus size={18} /> Add insurance
          </button>
        </div>
      )}

      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-7 mb-2 px-1">Government health IDs</h2>
      <section className="bg-card border border-border rounded-2xl p-4 divide-y divide-border">
        <DetailRow label="ABHA number" value={profile.abhaNumber && formatAbha(profile.abhaNumber)} copyLabel="ABHA number" />
        <DetailRow label="PM-JAY ID" value={profile.pmjayId} copyLabel="PM-JAY ID" />
      </section>
      {/* Without a policy, the empty-state button already opens the same form */}
      {hasPolicy && !profile.abhaNumber && !profile.pmjayId && (
        <button type="button" onClick={openEditor} className="link-btn text-sm mt-3 px-1">+ Add ABHA / PM-JAY ID</button>
      )}

      <div className="mt-6 flex gap-3 rounded-2xl p-4 bg-brand-soft text-sm">
        <Info size={18} className="text-brand shrink-0 mt-0.5" />
        <p>Your insurance details are included in your emergency medical card, so hospitals can see them at admission.</p>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{hasPolicy ? "Edit insurance" : "Add insurance"}</DialogTitle>
            <DialogDescription>Leave a field empty to remove it.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="mt-2">
            <h5 className="inp-txt">Insurance provider</h5>
            <Input type="text" value={form.insuranceProvider} onChange={update("insuranceProvider")} placeholder="Eg. Star Health" maxLength={100} />

            <h5 className="inp-txt">Policy number</h5>
            <Input type="text" value={form.insurancePolicyNumber} onChange={update("insurancePolicyNumber")} placeholder="Eg. SH-778812" maxLength={50} />

            <h5 className="inp-txt">ABHA number</h5>
            <Input type="text" value={form.abhaNumber} onChange={update("abhaNumber")} inputMode="numeric" placeholder="14 digits" maxLength={17} />

            <h5 className="inp-txt">PM-JAY ID</h5>
            <Input type="text" value={form.pmjayId} onChange={update("pmjayId")} placeholder="Ayushman Bharat ID" maxLength={30} />

            {saveError && <p className="form-error">{saveError}</p>}

            <button type="submit" className="signup-btn mt-2!" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Insurance;
