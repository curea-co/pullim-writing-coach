"use client";
// AssignmentCard — 안내서에서 추출된 과제 카드.
//   필드: 과제문·장르·분량·조건·선생님 루브릭 여부. 각 필드는 ConfidenceChip(추정=점선+확인 뱃지).
//   칩을 탭하면 인라인 편집(InlineEditor). 저장 시 sessionStorage(`pwc_coach_assignment`) + onChange.
//
// 2026-06-08 v2 이식 (Phase 1 PR C):
//   - ExtractedAssignment 타입을 lib/extract에서 import (PR A에서 lib에 정의).
//   - 분량 표시 정책: 교사값 그대로 유지 — 사용자 수정 시도 cap 없이 raw 저장. 채점 cap은 score-client(PR D 예정)가 호출 시점에. 범위 밖이면 안내 배너만 표시.
//   - sessionStorage 키 `pwc_coach_assignment` (Phase plan docs/27 §Phase 2 일관).

import { useEffect, useState } from "react";
import ConfidenceChip from "./ConfidenceChip";
import { type ExtractedAssignment } from "@/app/lib/extract";
import { capTargetToWritable, TARGET_MAX, TARGET_MIN } from "@/app/lib/grading";

// Codex PR #70: sessionStorage 저장/복원은 부모(/coach 페이지, Phase 2 PR D)의 책임.
//   본 컴포넌트는 onChange 콜백으로만 알림 — 저장만 하고 hydrate 없으면 새로고침 시 복원 X.
//   부모가 onChange로 받은 값을 sessionStorage에 저장하고, 다음 마운트 시 data prop으로 주입.

// 어느 필드를 편집 중인지. 조건은 인덱스로 식별.
type EditKey = "genre" | "target" | `cond:${number}` | null;

// 인라인 편집 입력칸 — 칩 자리에 그대로 들어가는 작은 폼.
function InlineEditor({
  label,
  initial,
  numeric,
  onSave,
  onCancel,
}: {
  label: string;
  initial: string;
  numeric?: boolean;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <span className="border-accent-mid bg-surface inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs">
      <span className="text-subtle-foreground">{label}</span>
      <input
        autoFocus
        type="text"
        inputMode={numeric ? "numeric" : "text"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(value);
          else if (e.key === "Escape") onCancel();
        }}
        className="text-foreground w-28 bg-transparent font-medium outline-none"
      />
      <button
        type="button"
        onClick={() => onSave(value)}
        className="text-accent-mid font-semibold"
      >
        저장
      </button>
      <button type="button" onClick={onCancel} className="text-subtle-foreground">
        취소
      </button>
    </span>
  );
}

export default function AssignmentCard({
  data,
  onChange,
}: {
  data: ExtractedAssignment;
  onChange?: (next: ExtractedAssignment) => void;
}) {
  const [a, setA] = useState(data);
  const [editing, setEditing] = useState<EditKey>(null);

  // 부모가 새 안내서를 넘기면(재추출 등) 내부 사본 동기화.
  useEffect(() => {
    setA(data);
  }, [data]);

  // 편집 확정 — 내부 상태 + 부모 콜백. 저장은 부모 책임(위 주석).
  const persist = (next: ExtractedAssignment) => {
    setA(next);
    onChange?.(next);
    setEditing(null);
  };

  const saveGenre = (value: string) => {
    const v = value.trim();
    if (!v) return setEditing(null);
    persist({ ...a, genre: { value: v, confidence: "confirmed" } });
  };

  const saveTarget = (value: string) => {
    const digits = value.replace(/[^\d]/g, "");
    const parsed = digits === "" ? null : Number(digits);
    // Codex PR #70: 사용자 수동 수정 시 capTargetToWritable로 채점 가능 범위(50~2,000) 적용.
    //   범위 밖 값을 그대로 저장하면 /api/score가 E10으로 거절 — 안내 문구와 실제 동작 어긋남.
    //   원본은 requested에 보존해 안내 배너에 표시 ("원본 N자 → M자로 조정").
    const { value: capped, requested } = capTargetToWritable(parsed);
    persist({
      ...a,
      target_char_count: {
        value: capped,
        confidence: "confirmed",
        ...(requested != null ? { requested } : {}),
      },
    });
  };

  const saveCondition = (index: number, value: string) => {
    const v = value.trim();
    const next = [...a.conditions];
    if (!v) next.splice(index, 1); // 비우면 조건 삭제
    else next[index] = v;
    persist({ ...a, conditions: next });
  };

  const targetValue = a.target_char_count.value;
  const targetRequested = a.target_char_count.requested;
  // 추출(extract.ts)에서 raw value 그대로 보존된 경우 범위 밖일 수 있음 → 사용자에게 안내.
  // 사용자 수동 수정(saveTarget)은 이미 cap 적용 → requested가 원본 보존.
  const targetOutOfRange =
    targetValue != null && (targetValue < TARGET_MIN || targetValue > TARGET_MAX);

  return (
    <section className="border-border bg-surface rounded-2xl border p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-foreground text-sm font-semibold">
          📋 과제 카드 — 안내서에서 자동 추출
        </h3>
        {a.teacher_rubric_present && (
          <span className="bg-band-good-surface text-band-good-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">
            ★ 선생님 루브릭 인식됨
          </span>
        )}
      </div>

      <p className="text-foreground mb-4 text-sm leading-relaxed">
        <span className="text-muted-foreground text-xs font-semibold">과제문 · </span>
        {a.prompt_text.value}
        {a.prompt_text.confidence === "inferred" && (
          <span className="text-accent-mid ml-2 text-xs">↻ 확인 필요</span>
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        {editing === "genre" ? (
          <InlineEditor
            label="장르"
            initial={a.genre.value}
            onSave={saveGenre}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <ConfidenceChip
            label="장르"
            value={a.genre.value}
            confidence={a.genre.confidence}
            onEdit={() => setEditing("genre")}
          />
        )}

        {editing === "target" ? (
          <InlineEditor
            label="분량"
            initial={targetValue != null ? String(targetValue) : ""}
            numeric
            onSave={saveTarget}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <ConfidenceChip
            label="분량"
            value={targetValue != null ? `${targetValue}자` : "제한 없음"}
            confidence={a.target_char_count.confidence}
            onEdit={() => setEditing("target")}
          />
        )}

        {a.conditions.map((c, i) =>
          editing === `cond:${i}` ? (
            <InlineEditor
              key={`edit-${i}`}
              label="조건"
              initial={c}
              onSave={(v) => saveCondition(i, v)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            // Codex PR #70: 같은 조건 두 번 입력 시 key 충돌 → 인덱스+value 조합으로 안정화.
            <ConfidenceChip
              key={`cond-${i}-${c}`}
              label="조건"
              value={c}
              confidence="confirmed"
              onEdit={() => setEditing(`cond:${i}`)}
            />
          ),
        )}
      </div>

      {/* 분량 안내 — 두 케이스:
          (1) 사용자 수동 수정 시 capTargetToWritable이 원본 → requested에 보존.
          (2) 추출 결과 raw value가 범위 밖.
          (1)이 우선 — 사용자가 직접 입력한 원본을 알려주는 게 더 명확. */}
      {targetRequested != null && targetValue != null && (
        <p className="bg-band-warn-surface text-band-warn-foreground mt-3 rounded-md px-3 py-2 text-[11px] leading-relaxed">
          ※ 입력하신 <strong>{targetRequested}자</strong>는 작성·채점 범위({TARGET_MIN}~{TARGET_MAX}자)를
          벗어나 <strong>{targetValue}자</strong>로 조정됐어요.
        </p>
      )}
      {targetRequested == null && targetOutOfRange && (
        <p className="bg-band-warn-surface text-band-warn-foreground mt-3 rounded-md px-3 py-2 text-[11px] leading-relaxed">
          ※ 안내서의 목표 <strong>{targetValue}자</strong>는 작성·채점 범위({TARGET_MIN}~{TARGET_MAX}자)를
          벗어나요. 분량 칩을 눌러 범위 안으로 수정해 주세요.
        </p>
      )}

      {a.raw_excerpt && (
        <details className="mt-4">
          <summary className="text-subtle-foreground cursor-pointer text-xs">
            안내서 원문 일부 보기
          </summary>
          <p className="bg-muted text-muted-foreground mt-2 rounded-md px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap">
            {a.raw_excerpt}
          </p>
        </details>
      )}

      <p className="text-subtle-foreground mt-4 text-[11px] leading-relaxed">
        ※ 잘못된 필드는 클릭해서 직접 수정할 수 있어요. 추정값(점선)은 한 번 확인해 주세요.
      </p>
    </section>
  );
}
