import { GraduationCap, Loader2 } from "lucide-react";
import { useState } from "react";
import { login, register } from "../services/api";
import { useAppStore } from "../store/useAppStore";

export default function Login() {
  const setAuth = useAppStore((s) => s.setAuth);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res =
        mode === "login"
          ? await login(email, password)
          : await register(name, email, password);
      setAuth(res.access_token, res.user);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          (Array.isArray(err?.response?.data?.detail)
            ? "Please check your input."
            : "Something went wrong.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">AI Teaching Assistant</h1>
          <p className="text-sm text-slate-400">
            {mode === "login" ? "Sign in to your workspace" : "Create your account"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-white/10 bg-white p-6 shadow-xl"
        >
          {mode === "register" && (
            <Field
              label="Name"
              value={name}
              onChange={setName}
              placeholder="Prof. Amartya Das"
              type="text"
              required
            />
          )}
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="you@university.edu"
            type="email"
            required
          />
          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            type="password"
            required
          />

          {error && (
            <div className="rounded-lg bg-destructive-soft px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.99] disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>

          <p className="pt-1 text-center text-xs text-slate-500">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
