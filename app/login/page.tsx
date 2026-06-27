"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/use-auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await login(email, password);
    setBusy(false);
    if (r.ok) router.push("/");
    else setError(r.message ?? "로그인에 실패했어요.");
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
