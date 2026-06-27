"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/lib/use-auth";
import { safeReturnTo } from "@/app/lib/safe-return-to";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await login(email, password);
      if (r.ok) router.push(safeReturnTo(params.get("returnTo"))); // same-origin returnTo(또는 홈)
      else setError(r.message ?? "로그인에 실패했어요.");
    } finally {
      setBusy(false); // 예외/네트워크 실패에도 버튼이 영구 disabled로 남지 않게.
    }
  };

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12">
      <h1 className="text-foreground mb-6 text-2xl font-bold">로그인</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="text-foreground mb-1 block font-medium">이메일</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="border-border w-full rounded-lg border px-3 py-2.5 text-sm" autoComplete="email" />
        </label>
        <label className="block text-sm">
          <span className="text-foreground mb-1 block font-medium">비밀번호</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="border-border w-full rounded-lg border px-3 py-2.5 text-sm" autoComplete="current-password" />
        </label>
        {error ? <p role="alert" className="text-sm text-[var(--color-danger,#dc2626)]">{error}</p> : null}
        <button type="submit" disabled={busy}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </main>
  );
}

// useSearchParams는 Suspense 경계가 필요(Next 정적분석) — 폼을 Suspense로 감싼다.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
