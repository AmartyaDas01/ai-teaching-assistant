import { MailCheck } from "lucide-react";
import { useState } from "react";
import NeuralAccessLogin from "@/components/ui/neural-access-login";
import { login, register, resendVerification } from "../services/api";
import { useAppStore } from "../store/useAppStore";

export default function Login() {
  const setAuth = useAppStore((s) => s.setAuth);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set once a confirmation link has been emailed - swaps the form for a notice. */
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  /** Login was rejected because the account is unverified - offer a resend. */
  const [needsVerify, setNeedsVerify] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsVerify(false);
    try {
      if (mode === "register") {
        const res = await register(name, email, password);
        if (res.verification_required) {
          setPendingEmail(email);
        } else if (res.token) {
          // No SMTP configured - the account is active immediately.
          setAuth(res.token.access_token, res.token.user);
        }
      } else {
        const res = await login(email, password);
        setAuth(res.access_token, res.user);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 403) setNeedsVerify(true); // unverified account
      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? "Please check your input."
            : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  if (pendingEmail) {
    return (
      <CheckInbox
        email={pendingEmail}
        onBack={() => {
          setPendingEmail(null);
          setMode("login");
          setError(null);
        }}
      />
    );
  }

  return (
    <NeuralAccessLogin
      mode={mode}
      name={name}
      email={email}
      password={password}
      loading={loading}
      error={error}
      resendEmail={needsVerify ? email : undefined}
      onNameChange={setName}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      onToggleMode={() => {
        setMode(mode === "login" ? "register" : "login");
        setError(null);
        setNeedsVerify(false);
        // Switching between signing in and signing up is a change of intent, so the
        // credential shouldn't carry over: a password typed to log in would otherwise
        // sit silently pre-filled in the signup form (and vice versa), which is both
        // confusing and a poor thing to leave lying in a field the user didn't fill.
        // Email is kept - it's the one value that's still relevant either way.
        setPassword("");
        setName("");
      }}
    />
  );
}

/** Shown after signup: the account exists but is inactive until the link is clicked. */
function CheckInbox({ email, onBack }: { email: string; onBack: () => void }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    try {
      await resendVerification(email);
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050505] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-8 text-center shadow-card">
        <MailCheck className="mx-auto mb-4 h-10 w-10 text-foreground" />
        <h1 className="text-lg font-bold text-slate-100">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted">
          We sent a confirmation link to{" "}
          <span className="font-semibold text-slate-200">{email}</span>. Click it to
          activate your account.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          It can take a minute to arrive - check spam if you don't see it.
        </p>

        <button
          onClick={resend}
          disabled={sending || sent}
          className="mt-5 w-full rounded-lg border border-white/10 bg-surface-2 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 disabled:opacity-50"
        >
          {sent ? "Link sent again" : sending ? "Sending…" : "Resend the link"}
        </button>
        <button
          onClick={onBack}
          className="mt-3 w-full text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
