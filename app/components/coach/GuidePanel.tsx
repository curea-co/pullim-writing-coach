"use client";

// 가이드 모드 — write 단계 직교 패널. 정적 질문 카드 + 참조용 메모(scratchpad).
//   불변식: 메모→캔버스 자동삽입 경로 없음('넣기'/복사 버튼 0). 메모는 pwc-guide-memos-v1에만 저장.
//   CoachSession·process-log에 미합류(대필 증거 오염 방지).

import { useEffect, useState } from "react";
import { guideQuestionsFor } from "@/app/lib/guide-prompts";

const MEMOS_KEY = "pwc-guide-memos-v1";

function loadMemos(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MEMOS_KEY);
    const o = raw ? (JSON.parse(raw) as unknown) : {};
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, string>) : {};
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
  //   질문이 다르면(장르 override) 분리된다. 읽기 시 레거시 area 단위 키로 폴백해 기존 메모 유실 방지.
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
          // 질문 키 우선, 없으면 레거시 area 키 폴백.
          const current = memos[q.question] ?? memos[q.area] ?? "";
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
