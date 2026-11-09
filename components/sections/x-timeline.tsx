"use client";

import { useId, useState } from "react";
import { ExternalLink } from "lucide-react";
import { normalizeXHandle } from "@/lib/x";

export function XTimeline({ account }: { account: string }) {
  const [opened, setOpened] = useState(false);
  const feedId = useId();
  const handle = normalizeXHandle(account);
  if (!handle) return null;
  // This is the cross-origin profile iframe used by X's widgets.js.
  const timeline = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}?lang=ar&dnt=true&theme=light`;

  return (
    <section className="ss-panel ss-x-account" aria-label="حساب المدرسة على إكس">
      <div className="ss-x-header">
        <div className="ss-x-identity">
          <span className="ss-x-icon" aria-hidden="true">𝕏</span>
          <div>
            <h2 className="ss-section-title">حساب المدرسة على إكس</h2>
            <p><bdi dir="ltr">@{handle}</bdi> · آخر المنشورات العامة للمدرسة</p>
          </div>
        </div>
        <div className="ss-action-row">
          <a className="ss-outline" href={`https://x.com/${handle}`} target="_blank" rel="noreferrer">
            فتح الحساب على إكس <ExternalLink size={16} aria-hidden="true" />
          </a>
          <button className="ss-button" type="button" aria-expanded={opened} aria-controls={feedId} onClick={() => setOpened(!opened)}>
            {opened ? "إخفاء المنشورات" : "عرض المنشورات هنا"}
          </button>
        </div>
      </div>
      <div id={feedId} hidden={!opened}>
        {opened && <>
          <p className="ss-x-hint">تُحمَّل المنشورات من إكس مباشرةً. إذا تعذّر عرضها هنا، افتح حساب المدرسة من الرابط أعلاه.</p>
          <iframe className="ss-x-frame" title="منشورات المدرسة العامة على إكس" src={timeline}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" />
        </>}
      </div>
    </section>
  );
}
