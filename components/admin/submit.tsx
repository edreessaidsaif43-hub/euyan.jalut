"use client";

import { useFormStatus } from "react-dom";

export function MediaFileInput({ maxMiB }: { maxMiB: number }) {
  const limit = maxMiB.toLocaleString("ar-OM");
  return <label className="admin-span">اختر ملفًا
    <input type="file" name="file" required accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,application/pdf"
      onChange={({ currentTarget: input }) => {
        const size = input.files?.[0]?.size ?? 0;
        input.setCustomValidity(size > maxMiB * 1024 ** 2 ? `اختر ملفًا لا يتجاوز ${limit} ميبيبايت.` : "");
        if (!input.validity.customError) return;
        input.reportValidity();
      }} />
    <small>الحد الأقصى {limit} ميبيبايت. الصور والفيديو وPDF مدعومة.</small>
  </label>;
}

export function Submit({ children, variant = "primary", confirmation, value, name }: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "nav";
  confirmation?: string;
  value?: string;
  name?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={"admin-button is-" + variant} disabled={pending}
      name={name} value={value} onClick={(event) => {
        if (confirmation && !window.confirm(confirmation)) event.preventDefault();
      }}>
      {pending ? "جارٍ التنفيذ…" : children}
    </button>
  );
}
