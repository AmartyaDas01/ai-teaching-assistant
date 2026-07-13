import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { verifyEmail } from "../services/api";
import { useAppStore } from "../store/useAppStore";

type State = "verifying" | "ok" | "error";

/**
 * Landing page for the emailed confirmation link (/verify?token=...).
 * On success the token is exchanged for a session, so clicking the link signs you in.
 */
export default function Verify() {
  const setAuth = useAppStore((s) => s.setAuth);
  const [state, setState] = useState<State>("verifying");
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    // StrictMode double-invokes effects in dev; the token is single-use, so guard it.
    if (ran.current) return;
    ran.current = true;

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState("error");
      setError("This link is missing its verification code.");
      return;
    }

    verifyEmail(token)
      .then((res) => {
        setState("ok");
        // Sign them in, then drop the token from the URL so it isn't left in history.
        window.history.replaceState({}, "", "/");
        setTimeout(() => setAuth(res.access_token, res.user), 900);
      })
      .catch((e: any) => {
        setState("error");
        setError(
          e?.response?.data?.detail ??
            "We couldn't verify this link. It may have expired."
        );
      });
  }, [setAuth]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050505] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-8 text-center shadow-card">
        {state === "verifying" && (
          <>
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-slate-400" />
            <h1 className="text-lg font-bold text-slate-100">Confirming your email…</h1>
            <p className="mt-1 text-sm text-muted">This will only take a moment.</p>
          </>
        )}

        {state === "ok" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-400" />
            <h1 className="text-lg font-bold text-slate-100">Email confirmed</h1>
            <p className="mt-1 text-sm text-muted">Signing you in…</p>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="mx-auto mb-4 h-10 w-10 text-rose-400" />
            <h1 className="text-lg font-bold text-slate-100">Couldn't confirm</h1>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <a
              href="/"
              className="mt-5 inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
            >
              Back to sign in
            </a>
          </>
        )}
      </div>
    </div>
  );
}
