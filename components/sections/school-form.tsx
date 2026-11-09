"use client";

import { useActionState, useId, useState } from "react";
import { CircleCheck, Send } from "lucide-react";
import { submitSchoolForm, type SchoolFormKind, type SchoolFormState } from "./form-action";

const INITIAL: SchoolFormState = { status: "ready", message: "" };

export function SchoolForm({
  kind, token, available, surveyId = null, options = [],
}: {
  kind: SchoolFormKind;
  token: string;
  available: boolean;
  surveyId?: string | null;
  options?: string[];
}) {
  const [state, action, pending] = useActionState(submitSchoolForm.bind(null, kind, surveyId), INITIAL);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [option, setOption] = useState("");
  const noticeId = useId();

  if (!available) {
    return (
      <>
        {kind === "survey" && options.length > 0 && (
          <div className="ss-body"><ul>{options.map((value) => <li key={value}>{value}</li>)}</ul></div>
        )}
        <p className="ss-muted">النموذج غير متاح حاليًا. يُفعّل بعد ربط الموقع بخدمة استقبال الردود.</p>
      </>
    );
  }
  if (state.status === "ok") {
    return <p className="ss-form-status ss-action-row" role="status"><CircleCheck size={19} aria-hidden="true" />{state.message}</p>;
  }

  return (
    <form className="ss-form" action={action} aria-describedby={noticeId}>
      <input type="hidden" name="client_token" value={token} />
      <label hidden aria-hidden="true">الموقع الإلكتروني <input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
      {kind === "survey" ? (
        <fieldset className="ss-options">
          <legend>اختاروا إجابة واحدة</legend>
          {options.map((value) => (
            <label key={value}>
              <input type="radio" name="option" required value={value} checked={value === option} onChange={() => setOption(value)} />
              <span>{value}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <>
          <label className="ss-field">
            الاسم
            <input name="name" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="ss-field">
            {kind === "suggestion" ? "البريد الإلكتروني (اختياري)" : "البريد الإلكتروني"}
            <input name="email" dir="ltr" type="email" autoComplete="email" required={kind === "contact"} maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="ss-field">
            {kind === "suggestion" ? "المقترح" : "الرسالة"}
            <textarea name="message" rows={4} required minLength={5} maxLength={2500} value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>
        </>
      )}
      <small id={noticeId}>{kind === "survey" ? "تطّلع إدارة المدرسة على الإجابات ضمن لوحة الإدارة." : "تُستخدم البيانات لمتابعة رسالتكم لدى المدرسة. أرسلوا البيانات اللازمة لموضوع الرسالة فقط."}</small>
      {state.status === "error" && <p className="ss-form-status" data-error role="alert">{state.message}</p>}
      <button className="ss-button" type="submit" disabled={pending}>
        <Send size={17} aria-hidden="true" />
        {pending ? "جارٍ الإرسال…" : kind === "survey" ? "إرسال الإجابة" : kind === "suggestion" ? "إرسال المقترح" : "إرسال الرسالة"}
      </button>
    </form>
  );
}
