"use client";

// 가이드 모드 — write 단계 직교 패널. 정적 질문 카드 + 참조용 메모(scratchpad).
//   불변식: 메모→캔버스 자동삽입 경로 없음('넣기'/복사 버튼 0). 메모는 pwc-guide-memos-v1에만 저장.
//   CoachSession·process-log에 미합류(대필 증거 오염 방지).

import { useEffect, useState } from "react";
import { GUIDE_QUESTIONS, guideQuestionsFor } from "@/app/lib/guide-prompts";
import { AREAS } from "@/app/lib/grading";

const MEMOS_KEY = "pwc-guide-memos-v1";

// 레거시(area 단위로 저장된) 메모를 해당 영역 default 질문 키로 1회 이관한다.
//   과거엔 모든 장르가 default 질문을 보여줬으므로 area 메모는 default 질문에 속한다 → default 질문 키로만
//   옮겨, 장르 override로 바뀐 다른 질문 아래로 새지 않게 한다(서로 다른 질문 간 메모 혼입 방지).
function migrateLegacyAreaKeys(raw: Record<string, string>): Record<string, string> {
  const out = { ...raw };
  for (const area of AREAS) {
    const legacy = out[area];
    if (typeof legacy === "string" && legacy.length > 0) {
      const defaultQ = GUIDE_QUESTIONS[area][0];
      if (typeof out[defaultQ] !== "string") out[defaultQ] = legacy;
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

  // 메모는 '표시되는 질문' 기준으로 보관한다 — 장르 문자열이 아니라 실제 질문에 메모가 따라간다.
  //   같은 질문이면(설명문·기타 등 default 풀로 폴백돼 동일 질문이 보이는 경우) 메모를 공유하고,
  //   질문이 다르면(장르 override) 분리된다. 레거시 area 메모는 loadMemos가 default 질문 키로 이관함.
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
          const current = memos[q.question] ?? "";
          return (
            <li key={q.area}>
              <p className="text-foreground text-sm font-medium">{q.question}</p>
              <textarea
                aria-label={`${q.area} 메모`}
                value={current}
                onChange={(e) => setMemo(q.question, e.target.value)}
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
