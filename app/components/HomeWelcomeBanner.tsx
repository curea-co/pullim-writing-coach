"use client";
// 홈 상단 배너 — 프로필 상태에 따라 분기:
//   (a) 없음 → "처음이세요? 온보딩 시작" CTA → /onboarding
//   (b) 있음 → "○○님, 다시 채점받기" 짧은 인사 + /try CTA + /me 링크
// SSR 안전 가드: 마운트 전엔 아무것도 안 보여 깜박임·하이드레이션 mismatch 방지.

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadProfile, type Profile } from "../lib/storage";

export default function HomeWelcomeBanner() {
  const [profile, setProfile] = useState<Profile | null | "loading">("loading");

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  if (profile === "loading") {
    // 자리 차지 placeholder — 레이아웃 점프 방지(높이 근사치)
    return <div className="mb-8 h-[68px]" aria-hidden="true" />;
  }

  if (!profile) {
    return (
      <section className="border-border bg-surface mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <div className="min-w-0">
          <p className="text-foreground break-keep text-sm font-semibold">
            처음이세요? 1분이면 시작할 수 있어요
          </p>
          <p className="text-muted-foreground break-keep mt-0.5 text-xs">
            닉네임·학년·과목만 알려주시면 채점 결과를 보기 좋아요.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex h-10 shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          온보딩 시작
        </Link>
      </section>
    );
  }

  return (
    <section className="border-border bg-surface mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
      <div className="min-w-0">
        <p className="text-foreground break-keep text-sm font-semibold">
          <span className="text-primary">{profile.nickname}님</span>, 오늘도 좋은 글
          쓰셨어요?
        </p>
        <p className="text-muted-foreground break-keep mt-0.5 text-xs">
          {profile.school_level} · {
            profile.primary_subject === "기타"
              ? profile.primary_subject_other || "기타"
              : profile.primary_subject
          }
          {profile.frequent_genre ? ` · ${profile.frequent_genre}` : ""} 기준으로
          준비됐어요.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link
          href="/try"
          className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          내 글 채점받기
        </Link>
        <Link
          href="/me"
          className="border-border bg-surface text-foreground hover:bg-muted inline-flex h-10 items-center rounded-lg border px-3 text-sm font-medium"
        >
          내 정보
        </Link>
      </div>
    </section>
  );
}
