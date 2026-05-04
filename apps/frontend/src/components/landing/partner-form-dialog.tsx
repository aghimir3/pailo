"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  User,
} from "lucide-react";

const PARTNER_TYPES = [
  { value: "retail", label: "Retail Shop" },
  { value: "supermarket", label: "Supermarket" },
  { value: "direct", label: "Direct Buyer" },
  { value: "wholesale", label: "Wholesale" },
  { value: "other", label: "Other" },
] as const;

type FormState = "idle" | "submitting" | "success" | "error";

export function PartnerFormDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [partnerType, setPartnerType] = useState("retail");
  const [message, setMessage] = useState("");

  if (!open) return null;

  function resetForm() {
    setName("");
    setBusinessName("");
    setPhone("");
    setEmail("");
    setLocation("");
    setPartnerType("retail");
    setMessage("");
    setFormState("idle");
    setErrorMsg("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          business_name: businessName.trim() || null,
          phone: phone.trim(),
          email: email.trim() || null,
          location: location.trim() || null,
          partner_type: partnerType,
          message: message.trim() || null,
        }),
      });

      if (res.status === 429) {
        setFormState("error");
        setErrorMsg("Too many submissions. Please try again later.");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFormState("error");
        setErrorMsg(data?.detail ?? "Something went wrong. Please try again.");
        return;
      }

      setFormState("success");
    } catch {
      setFormState("error");
      setErrorMsg("Network error. Please check your connection and try again.");
    }
  }

  return (
    <div
      className="partner-dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="partner-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-dialog-title"
      >
        <button
          className="partner-dialog-close"
          onClick={handleClose}
          aria-label="Close"
          type="button"
        >
          <X size={18} />
        </button>

        {formState === "success" ? (
          <div className="partner-dialog-success">
            <div className="partner-success-icon">
              <CheckCircle2 size={48} />
            </div>
            <h2>Thank you!</h2>
            <p>
              We&apos;ve received your inquiry. Our team will reach out to you
              shortly.
            </p>
            <button
              className="partner-dialog-btn"
              onClick={handleClose}
              type="button"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="partner-dialog-header">
              <h2 id="partner-dialog-title">Partner with Pailo</h2>
              <p>
                Tell us about your business and we&apos;ll get back to you
                within 24 hours.
              </p>
            </div>

            <form className="partner-dialog-form" onSubmit={handleSubmit}>
              <div className="partner-field">
                <label htmlFor="partner-name">
                  <User size={14} aria-hidden="true" />
                  Your Name <span className="partner-required">*</span>
                </label>
                <input
                  id="partner-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={200}
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="partner-field">
                <label htmlFor="partner-business">
                  <Building2 size={14} aria-hidden="true" />
                  Business Name
                </label>
                <input
                  id="partner-business"
                  type="text"
                  maxLength={200}
                  placeholder="Shop or company name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div className="partner-field-row">
                <div className="partner-field">
                  <label htmlFor="partner-phone">
                    <Phone size={14} aria-hidden="true" />
                    Phone <span className="partner-required">*</span>
                  </label>
                  <input
                    id="partner-phone"
                    type="tel"
                    required
                    minLength={7}
                    maxLength={40}
                    placeholder="98XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="partner-field">
                  <label htmlFor="partner-email">
                    <Mail size={14} aria-hidden="true" />
                    Email
                  </label>
                  <input
                    id="partner-email"
                    type="email"
                    maxLength={256}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="partner-field-row">
                <div className="partner-field">
                  <label htmlFor="partner-location">
                    <MapPin size={14} aria-hidden="true" />
                    Location
                  </label>
                  <input
                    id="partner-location"
                    type="text"
                    maxLength={200}
                    placeholder="City or district"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="partner-field">
                  <label htmlFor="partner-type">
                    <Building2 size={14} aria-hidden="true" />
                    Partnership Type <span className="partner-required">*</span>
                  </label>
                  <select
                    id="partner-type"
                    required
                    value={partnerType}
                    onChange={(e) => setPartnerType(e.target.value)}
                  >
                    {PARTNER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="partner-field">
                <label htmlFor="partner-message">
                  <MessageSquare size={14} aria-hidden="true" />
                  Message
                </label>
                <textarea
                  id="partner-message"
                  maxLength={2000}
                  rows={3}
                  placeholder="Tell us about your requirements, volumes, or any questions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {errorMsg && (
                <div className="partner-error" role="alert">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="partner-dialog-btn"
                disabled={formState === "submitting"}
              >
                {formState === "submitting" ? (
                  <>
                    <Loader2 size={16} className="partner-spinner" />
                    Sending...
                  </>
                ) : (
                  <>
                    Submit Inquiry
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
