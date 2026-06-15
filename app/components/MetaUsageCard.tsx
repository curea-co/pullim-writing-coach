"use client";
// MetaUsageCard — /me에서 학생의 학습된 사용 이력(자주 쓰는 학년·과목·장르·목표 분량) 시각화.
//   데이터: storage.ts loadValidatedMetaUsage (#41 LRU + Codex PR #56 enum/범위 필터).
//   UX: 사용자가 "내 패턴이 학습됐다" 인지 → /try 진입 시 자연 prefill을 의식적으로 신뢰.
//
// 빈 상태: "아직 학습된 패턴이 없어요" + /try 안내. 결과 없으면 cards X.
//
// Codex PR #56: 손상/오래된 LS 값(enum 외, 범위 밖)을 그대로 노출하면 /try prefill 로직
//   (getMostUsedMeta = 동일 필터)과 어긋남. loadValidatedMetaUsage로 일관 필터링.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  type MetaField,
  type MetaUsage,
  loadValidatedMetaUsage,
} from "@/app/lib/storage";

const FIELD_LABELS: Record<MetaField, string> = {
  school_level: "학년",
  subject: "과목",
  genre: "장르",
  target_raw: "목표 분량",
};

export default function MetaUsageCard() {
  const [usage, setUsage] = useState<MetaUsage | null>(null);

  useEffect(() => {
    setUsage(loadValidatedMetaUsage());
  }, []);

  // 마운트 전(SSR snapshot)에는 안 그림 — hydration mismatch 방지.
  if (usage === null) return null;

  // 전 필드 합산 항목 수 — 0이면 학습 이력 없음.
  const totalEntries = Object.values(usage).reduce((sum, list) => sum + list.length, 0);

  return (
    <section className="border-border bg-surface mt-8 rounded-xl border p-5">
      <h2 className="text-foreground text-sm font-semibold">자주 쓰는 메타</h2>
      <p className="text-muted-foreground break-keep mt-1 text-xs leading-relaxed">
        채점 받을 때마다 자동으로 학습돼요. /try 진입 시 프로필 값이 우선 적용되고, 비어 있는 항목은 여기 최빈값이 자연 prefill로 채워져요.
      </p>

      {totalEntries === 0 ? (
        <div className="border-border bg-muted/30 mt-4 rounded-md border p-4 text-center">
          <p className="text-muted-foreground break-keep text-xs leading-relaxed">
            아직 학습된 패턴이 없어요. 한 편 채점받으면 여기에 자주 쓰는 학년·과목·장르·목표 분량이 쌓여요.
          </p>
          <Link
            href="/try"
            className="bg-primary text-primary-foreground mt-3 inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold transition hover:opacity-90"
          >
            직접 채점받기 →
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {(Object.keys(usage) as MetaField[]).map((field) => {
            const list = usage[field];
            if (list.length === 0) return null;
            // count desc → last_used_at desc로 정렬 (getMostUsedMeta와 동일 순서)
            const sorted = [...list].sort((a, b) => {
              if (b.count !== a.count) return b.count - a.count;
              return b.last_used_at.localeCompare(a.last_used_at);
            });
            return (
              <div key={field}>
                <div className="text-muted-foreground mb-1.5 text-xs font-medium">
                  {FIELD_LABELS[field]} (LRU {list.length}/5)
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {sorted.map((entry, idx) => {
                    const isTop = idx === 0;
                    return (
                      <li
                        key={entry.value}
                        className={
                          isTop
                            ? "bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                            : "border-border bg-background text-foreground inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
                        }
                        title={`${entry.count}회 사용 · ${entry.last_used_at.slice(0, 10)}`}
                      >
                        <span>{entry.value}</span>
                        <span className="text-[10px] opacity-75 tabular-nums">
                          ×{entry.count}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
