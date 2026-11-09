import {
  Award, BookOpen, CalendarDays, CalendarRange, Camera, ClipboardList,
  GraduationCap, Handshake, HeartHandshake, Megaphone, Newspaper,
  Rocket, School, Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { KIND_LABELS, PUBLIC_KINDS, SECTIONS, sectionForKind as keyForKind } from "@/lib/site-config";

const sectionIcons = {
  about: School,
  news: Newspaper,
  initiative: Rocket,
  event: CalendarDays,
  schedule: ClipboardList,
  achievement: Award,
  resource: BookOpen,
  parent: HeartHandshake,
  calendar: CalendarRange,
  gallery: Camera,
  partnership: Handshake,
  contact: Send,
};

export type PublicSection = keyof typeof sectionIcons;

const groupedKinds: Partial<Record<PublicSection, string[]>> = {
  news: ["news", "announcement"],
  parent: ["parent", "survey"],
  calendar: ["event", "calendar"],
};

type Section = { title: string; description: string; kinds: string[]; icon: LucideIcon };
export const publicSections = Object.fromEntries(SECTIONS.map(({ key, label, description }) => {
  const section = key as PublicSection;
  return [section, { title: label, description, kinds: groupedKinds[section] ?? [key], icon: sectionIcons[section] }];
})) as Record<PublicSection, Section>;

export const kindLabels = KIND_LABELS;
export const searchableKinds = PUBLIC_KINDS;

export function sectionForKind(kind: string): PublicSection {
  const section = keyForKind(kind);
  return Object.hasOwn(publicSections, section) ? section as PublicSection : "about";
}

export const kindIcons: Record<string, LucideIcon> = {
  ...sectionIcons,
  announcement: Megaphone,
  survey: ClipboardList,
  stat: GraduationCap,
};

const readableDate = new Intl.DateTimeFormat("ar-OM", {
  calendar: "gregory",
  dateStyle: "long",
  timeZone: "Asia/Muscat",
});

const readableTime = new Intl.DateTimeFormat("ar-OM", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Muscat",
});

export function formatOmanDate(value?: string | null) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "";
  return readableDate.format(new Date(value));
}

export function formatOmanTime(value?: string | null) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "";
  return readableTime.format(new Date(value));
}

export function safeHref(value: unknown, allowLocal = false) {
  if (typeof value !== "string") return "";
  if (allowLocal && /^\/(?![/\\])/.test(value)) return value;
  try {
    const url = new URL(value);
    return !url.username && !url.password && (url.protocol === "https:" || (allowLocal && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export function isVideoPath(value?: string | null) {
  return typeof value === "string" && /\.(?:mp4|webm|ogv|mov)(?:[?#]|$)/i.test(value);
}
