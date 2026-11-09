"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Timer } from "lucide-react";
import { formatOmanDate, formatOmanTime, kindLabels } from "./config";

export type CalendarEntry = {
  slug: string;
  title: string;
  kind: string;
  start: string;
  end?: string | null;
  demo: boolean;
  location?: string;
};

const numerals = new Intl.NumberFormat("ar-OM");
const monthName = new Intl.DateTimeFormat("ar-OM", { month: "long", year: "numeric", timeZone: "UTC", calendar: "gregory" });
const omanDay = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Muscat" });
const weekdays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const hrefFor = (slug: string) => `/details/${encodeURIComponent(slug)}`;

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayInOman(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(omanDay.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateFor(key: string) {
  return new Date(`${key}T00:00:00Z`);
}

export function SchoolCalendar({ items, initialTime }: { items: CalendarEntry[]; initialTime: string }) {
  const today = dayInOman(initialTime);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const grid = useRef<HTMLDivElement>(null);
  const refocusDay = useRef(false);
  const instructionsId = useId();
  const entries = useMemo(() => items.map((item) => ({
    ...item,
    startDay: dayInOman(item.start),
    endDay: dayInOman(item.end || item.start),
  })).filter((item) => item.startDay).sort((a, b) => Date.parse(a.start) - Date.parse(b.start)), [items]);
  const monthStart = dateFor(`${month}-01`);
  const firstWeekday = monthStart.getUTCDay();
  const year = monthStart.getUTCFullYear();
  const monthIndex = monthStart.getUTCMonth();
  const numberOfDays = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const eventsFor = (key: string) => entries.filter((item) => item.startDay <= key && (item.endDay || item.startDay) >= key);
  const selectedItems = eventsFor(selected);
  const upcoming = entries.find((item) => Date.parse(item.start) > Date.parse(initialTime));

  useEffect(() => {
    if (refocusDay.current) {
      refocusDay.current = false;
      grid.current?.querySelector<HTMLButtonElement>(`[data-day="${selected}"]`)?.focus();
    }
  }, [selected]);

  const shiftMonth = (shift: number) => {
    const next = isoDay(new Date(Date.UTC(year, monthIndex + shift, 1)));
    setMonth(next.slice(0, 7));
    setSelected(next.slice(0, 7) === today.slice(0, 7) ? today : next);
  };

  const moveDay = (event: KeyboardEvent<HTMLButtonElement>, key: string) => {
    const date = dateFor(key);
    const offsets: Record<string, number> = {
      ArrowLeft: 1, ArrowRight: -1, ArrowUp: -7, ArrowDown: 7,
      Home: -date.getUTCDay(), End: 6 - date.getUTCDay(),
    };
    if (!Object.hasOwn(offsets, event.key)) return;
    event.preventDefault();
    const shift = offsets[event.key];
    if (!shift) return;
    date.setUTCDate(date.getUTCDate() + shift);
    const next = isoDay(date);
    refocusDay.current = true;
    setMonth(next.slice(0, 7));
    setSelected(next);
  };

  return (
    <>
      {upcoming && <EventCountdown event={upcoming} initialTime={initialTime} />}
      <div className="ss-split">
        <section className="ss-panel" aria-label="تقويم الشهر">
          <div className="ss-calendar-top">
            <h2 aria-live="polite">{monthName.format(monthStart)}</h2>
            <div className="ss-calendar-controls">
              <button type="button" className="ss-outline" aria-label="الشهر السابق" onClick={() => shiftMonth(-1)}><ChevronRight size={18} aria-hidden="true" /></button>
              <button type="button" className="ss-outline" onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}>اليوم</button>
              <button type="button" className="ss-outline" aria-label="الشهر التالي" onClick={() => shiftMonth(1)}><ChevronLeft size={18} aria-hidden="true" /></button>
            </div>
          </div>
          <p id={instructionsId} className="ss-sr">استخدموا مفاتيح الأسهم للتنقّل بين الأيام.</p>
          <div className="ss-calendar-grid" ref={grid} role="group" aria-label="أيام الشهر" aria-describedby={instructionsId}>
            {weekdays.map((weekday) => <span key={weekday} className="ss-weekday">{weekday}</span>)}
            {Array.from({ length: firstWeekday }, (_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}
            {Array.from({ length: numberOfDays }, (_, index) => {
              const day = index + 1;
              const key = `${month}-${String(day).padStart(2, "0")}`;
              const count = eventsFor(key).length;
              return (
                <button type="button" key={key} data-day={key} tabIndex={selected === key ? 0 : -1}
                  onClick={() => setSelected(key)} onKeyDown={(event) => moveDay(event, key)}
                  aria-label={`${formatOmanDate(dateFor(key).toISOString())}${count ? "، توجد مواعيد" : ""}`}
                  aria-pressed={selected === key} aria-current={key === today ? "date" : undefined}>
                  {numerals.format(day)}{count > 0 && <i aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>
        <section className="ss-panel">
          <h2 className="ss-section-title" aria-live="polite">{formatOmanDate(dateFor(selected).toISOString())}</h2>
          {selectedItems.length ? (
            <div className="ss-rows">
              {selectedItems.map((item) => (
                <article key={item.slug} className="ss-row">
                  <div className="ss-row-main">
                    <div className="ss-chips">
                      <span className="ss-chip">{kindLabels[item.kind] ?? "موعد"}</span>
                      {item.demo && <span className="ss-chip ss-chip-demo">محتوى تجريبي</span>}
                    </div>
                    <h3><Link className="ss-text-link" href={hrefFor(item.slug)}>{item.title}<ArrowLeft size={15} aria-hidden="true" /></Link></h3>
                    <div className="ss-meta">
                      <time dateTime={item.start}><Clock size={15} aria-hidden="true" />{formatOmanTime(item.start)}</time>
                      {item.location && <span><MapPin size={15} aria-hidden="true" />{item.location}</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="ss-muted">لا توجد مواعيد منشورة لهذا اليوم. تشير النقطة أسفل التاريخ إلى وجود موعد.</p>}
        </section>
      </div>
    </>
  );
}

export function EventCountdown({ event, initialTime }: { event: CalendarEntry; initialTime: string }) {
  const start = Date.parse(event.start);
  const [now, setNow] = useState(() => Date.parse(initialTime));
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= start) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [start]);
  const remaining = Math.max(0, Math.ceil((start - now) / 1000));
  const units = [
    { label: "يوم", value: Math.floor(remaining / 86400) },
    { label: "ساعة", value: Math.floor(remaining / 3600) % 24 },
    { label: "دقيقة", value: Math.floor(remaining / 60) % 60 },
    { label: "ثانية", value: remaining % 60 },
  ];
  return (
    <section className="ss-panel ss-countdown">
      <span className="ss-kicker"><Timer size={17} aria-hidden="true" /> الموعد القادم</span>
      <h2>{event.title}</h2>
      <div className="ss-meta">
        <time dateTime={event.start}><CalendarDays size={15} aria-hidden="true" />{formatOmanDate(event.start)} · {formatOmanTime(event.start)}</time>
        {event.demo && <span className="ss-chip ss-chip-demo">محتوى تجريبي</span>}
      </div>
      {remaining > 0
        ? <div className="ss-count-items" role="timer" aria-label="الوقت المتبقّي">
            {units.map(({ label, value }) => <div className="ss-count-unit" key={label}><strong>{numerals.format(value)}</strong>{label}</div>)}
          </div>
        : <p>حلّ موعد بدء الفعالية.</p>}
      <Link className="ss-text-link" href={hrefFor(event.slug)}>تفاصيل الموعد <ArrowLeft size={15} aria-hidden="true" /></Link>
    </section>
  );
}
