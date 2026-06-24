"use client";

// 가이드 모드 — write 단계 직교 패널. 정적 질문 카드 + 참조용 메모(scratchpad).
//   불변식: 메모→캔버스 자동삽입 경로 없음('넣기'/복사 버튼 0). 메모는 pwc-guide-memos-v1에만 저장.
//   CoachSession·process-log에 미합류(대필 증거 오염 방지).

import { useEffect, useState } from "react";
import { guideMemoKey, guideQuestionsFor } from "@/app/lib/guide-prompts";
import { AREAS } from "@/app/lib/grading";

const MEMOS_KEY = "pwc-guide-memos-v1";

// 레거시(area 단위로 저장된) 메모를 default 풀 안정 키(`default::<area>`)로 1회 이관한다.
//   과거엔 모든 장르가 default 질문을 보여줬으므로 area 메모는 default 풀에 속한다 → default 키로만 옮겨,
//   장르 override가 있는 (genre, area) 아래로 새지 않게 한다. (`default::` 형식은 guideMemoKey와 일치.)
function migrateLegacyAreaKeys(raw: Record<string, string>): Record<string, string> {
  const out = { ...raw };
  for (const area of AREAS) {
    const legacy = out[area];
    if (typeof legacy === "string" && legacy.length > 0) {
      const target = `default::${area}`;
      if (typeof out[target] !== "string") out[target] = legacy;
      delete out[area];
    }
  }
  return out;
}

function loadMemos(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MEMOS_KEY);
    const o = raw ? (JSON.parse(raw) as unknown) : {};
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    return migrateLegacyAreaKeys(o as Record<string, string>);
  } catch {
    return {};
  }
}

function saveMemos(m: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MEMOS_KEY, JSON.stringify(m));
  } catch {
    /* swallow */
  }
}

export default function GuidePanel({ genre }: { genre: string }) {
  const questions = guideQuestionsFor(genre);
  const [memos, setMemos] = useState<Record<string, string>>({});

  useEffect(() => {
    setMemos(loadMemos());
  }, []);

  // 메모는 guideMemoKey(genre, area)의 '안정 키'로 보관한다 — 질문 문구가 아니라 출처 기준이라
  //   문구를 다듬어도 유실 없음. default 폴백 장르는 공유, override 장르만 분리.
  function setMemo(key: string, value: string) {
    const next = { ...memos, [key]: value };
    setMemos(next);
    saveMemos(next);
  }

  return (
    <section aria-label="가이드 질문" className="border-border bg-surface rounded-xl border p-4">
      <p className="text-subtle-foreground mb-3 text-[11px] font-semibold tracking-wide">
        막힐 때 — 아래 질문에 네 말로 메모해 봐 (참고용, 본문은 캔버스에 직접 써요)
      </p>
      <ul className="space-y-3">
        {questions.map((q) => {
          const key = guideMemoKey(genre, q.area);
          return (
            <li key={q.area}>
              <p className="text-foreground text-sm font-medium">{q.question}</p>
              <textarea
                aria-label={`${q.area} 메모`}
                value={memos[key] ?? ""}
                onChange={(e) => setMemo(key, e.target.value)}
                placeholder="네 생각을 한 줄로…"
                rows={2}
                className="border-border bg-background text-foreground mt-1.5 w-full resize-y rounded-lg border px-2.5 py-1.5 text-sm"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
