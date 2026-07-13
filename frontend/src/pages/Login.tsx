import { useState } from "react";
import NeuralAccessLogin from "@/components/ui/neural-access-login";
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
    <NeuralAccessLogin
      mode={mode}
      name={name}
      email={email}
      password={password}
      loading={loading}
      error={error}
      onNameChange={setName}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      onToggleMode={() => {
        setMode(mode === "login" ? "register" : "login");
        setError(null);
      }}
    />
  );
}
