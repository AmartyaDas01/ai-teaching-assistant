import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { checkEmail, resendVerification } from "../../services/api";

// Practical rather than RFC-exhaustive: the backend does the authoritative check
// (including an MX lookup). This exists to catch a typo before a round trip.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Domains people fat-finger constantly. The backend's MX check rejects these, but
 *  only after submitting - catching them here turns a failed signup into one click. */
const TYPO_DOMAINS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmaill.com": "gmail.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloook.com": "outlook.com",
};

function inspectEmail(value: string): { error?: string; suggestion?: string } {
  const v = value.trim();
  if (!v) return {};
  if (!EMAIL_RE.test(v)) {
    return { error: "That doesn't look like a valid email address." };
  }
  const domain = v.split("@")[1]?.toLowerCase();
  const fixed = TYPO_DOMAINS[domain];
  if (fixed) return { suggestion: v.replace(/@[^@]*$/, `@${fixed}`) };
  return {};
}

export interface NeuralAccessLoginProps {
  mode: "login" | "register";
  name: string;
  email: string;
  password: string;
  loading?: boolean;
  error?: string | null;
  /** Set when login failed because the account is unverified - offers a resend link. */
  resendEmail?: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onToggleMode: () => void;
}

/**
 * Liquid-mercury login surface. Presentational only - all auth state and the submit
 * handler are passed in as props so the page (Login.tsx) owns the real login/register
 * flow. Adapted from the "Neural Access" concept: dark gooey-blob background with a
 * mouse-parallax effect, monospace accents, and a mercury-drop submit button.
 */
export default function NeuralAccessLogin({
  mode,
  name,
  email,
  password,
  loading = false,
  error = null,
  resendEmail,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleMode,
}: NeuralAccessLoginProps) {
  const [resent, setResent] = useState(false);

  /**
   * Custom required-field warnings, replacing the browser's native validation
   * bubbles (the form is noValidate). A failed submit shows one warning per
   * offending field; the batch clears itself after 5 seconds, and typing in a
   * field dismisses its warning early so the text never contradicts the input.
   */
  const [warnings, setWarnings] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const warnTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(warnTimer.current), []);

  const clearWarning = (field: keyof typeof warnings) =>
    setWarnings((w) => (w[field] ? { ...w, [field]: undefined } : w));

  const handleSubmit = (e: FormEvent) => {
    const next: typeof warnings = {};
    if (mode === "register" && !name.trim()) {
      next.name = "Please enter your name.";
    }
    // A malformed address also blocks here: noValidate turns off the browser's
    // type="email" check, which used to catch it in login mode.
    next.email = !email.trim()
      ? "Please enter your email address."
      : inspectEmail(email).error;
    if (!password) {
      next.password =
        mode === "login"
          ? "Please enter your password."
          : "Please choose a password.";
    }

    const missing = (["name", "email", "password"] as const).filter(
      (f) => next[f]
    );
    if (missing.length > 0) {
      e.preventDefault();
      setWarnings(next);
      window.clearTimeout(warnTimer.current);
      warnTimer.current = window.setTimeout(() => setWarnings({}), 5000);
      document.getElementById(`na-${missing[0]}`)?.focus();
      return;
    }
    onSubmit(e);
  };

  /**
   * Live email verification.
   *
   * Two stages, cheapest first: the format is checked in the browser (instant, no
   * network), and only a well-formed address is sent to the server, which does a real
   * DNS/MX lookup to prove the domain can actually receive mail.
   *
   * The check waits for a pause in typing - validating every keystroke would mean a
   * DNS lookup per character, and "a@" is not yet a mistake worth scolding.
   */
  const [emailState, setEmailState] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    const value = email.trim();
    setSuggestion(null);
    setEmailMessage(null);

    if (!value) {
      setEmailState("idle");
      return;
    }

    const local = inspectEmail(value);
    if (local.error) {
      // Malformed - no point asking the server about it.
      setEmailState("invalid");
      setEmailMessage(local.error);
      return;
    }

    setEmailState("checking");
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await checkEmail(value, controller.signal);
        if (controller.signal.aborted) return;
        if (result.valid) {
          setEmailState("valid");
          // The address is real, but the domain still looks fat-fingered.
          if (local.suggestion) setSuggestion(local.suggestion);
        } else {
          setEmailState("invalid");
          setEmailMessage(result.detail ?? "That email address doesn't exist.");
          if (local.suggestion) setSuggestion(local.suggestion);
        }
      } catch {
        // Offline or the request was superseded: never block signup on our own
        // convenience check - the server validates again at submit anyway.
        if (!controller.signal.aborted) setEmailState("idle");
      }
    }, 700);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [email]);
  // Generate static random blob values once per mount to keep positions stable.
  const blobsData = useMemo(
    () =>
      Array.from({ length: 6 }).map(() => ({
        size: Math.random() * 200 + 150,
        left: Math.random() * 80 + 10,
        top: Math.random() * 80 + 10,
        animationDelay: Math.random() * -20,
        animationDuration: Math.random() * 15 + 15,
      })),
    []
  );

  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      // Subtle parallax per blob via margins (leaves the CSS transform animation intact).
      blobRefs.current.forEach((blob, index) => {
        if (blob) {
          const speed = (index + 1) * 20;
          blob.style.marginLeft = `${x * speed}px`;
          blob.style.marginTop = `${y * speed}px`;
        }
      });
    };
    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const heroTop = mode === "login" ? "WELCOME" : "GET";
  const heroBottom = mode === "login" ? "BACK" : "STARTED";
  const submitLabel = loading
    ? mode === "login"
      ? "Signing in…"
      : "Creating…"
    : mode === "login"
    ? "Sign In"
    : "Create Account";

  return (
    <div className="mercury-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;800&family=Space+Mono&display=swap');

        .mercury-wrapper {
          --bg: #050505;
          --mercury: #e0e0e0;
          --mercury-dark: #666666;
          --accent: #ffffff;
          --text-dim: rgba(255, 255, 255, 0.5);
          --filter-goo: url('#gooey');

          background-color: var(--bg);
          color: var(--accent);
          font-family: 'Inter', sans-serif;
          height: 100vh;
          /* dvh accounts for mobile browser chrome (the address bar), which makes a
             plain 100vh overflow and clip the form on phones. */
          height: 100dvh;
          width: 100%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .mercury-wrapper * {
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
        }

        /* Background liquid physics simulation */
        .mercury-wrapper .stage {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 0;
          filter: var(--filter-goo);
          opacity: 0.6;
        }

        .mercury-wrapper .blob {
          position: absolute;
          background: linear-gradient(135deg, var(--mercury), #888);
          border-radius: 50%;
          filter: blur(20px);
          animation: mercuryFloat 20s infinite alternate ease-in-out;
          box-shadow: inset -10px -10px 20px rgba(0,0,0,0.5),
                      10px 10px 30px rgba(255,255,255,0.2);
          transition: margin 0.1s ease-out;
        }

        @keyframes mercuryFloat {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(10vw, 20vh) scale(1.2); }
          66% { transform: translate(-5vw, 10vh) scale(0.8); }
          100% { transform: translate(5vw, -10vh) scale(1.1); }
        }

        /* Interface container */
        .mercury-wrapper .auth-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          padding: 40px;
        }

        .mercury-wrapper .header {
          margin-bottom: 48px;
          text-align: left;
        }

        .mercury-wrapper .brand-id {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 12px;
          display: block;
        }

        .mercury-wrapper .header h1 {
          font-weight: 800;
          font-size: 3rem;
          line-height: 0.9;
          letter-spacing: -2px;
          margin-left: -4px;
          margin-top: 0;
          margin-bottom: 0;
        }

        /* Form elements */
        .mercury-wrapper .form-group {
          position: relative;
          margin-bottom: 30px;
          transition: transform 0.4s cubic-bezier(0.2, 1, 0.3, 1);
        }

        .mercury-wrapper .form-group:focus-within {
          transform: translateX(10px);
        }

        .mercury-wrapper .form-group label {
          display: block;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--text-dim);
          margin-bottom: 12px;
          text-transform: uppercase;
        }

        .mercury-wrapper .form-group input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--accent);
          padding: 12px 0;
          font-size: 18px;
          outline: none;
          transition: border-color 0.4s;
        }

        .mercury-wrapper .form-group input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }

        .mercury-wrapper .input-glow {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0%;
          height: 2px;
          background: var(--mercury);
          transition: width 0.6s cubic-bezier(0.2, 1, 0.3, 1);
          box-shadow: 0 0 15px var(--mercury);
        }

        .mercury-wrapper .form-group input:focus ~ .input-glow {
          width: 100%;
        }

        /* Scopes the glow to the input when a status message follows the field. */
        .mercury-wrapper .input-wrap {
          position: relative;
          display: block;
        }

        .mercury-wrapper .input-wrap input:focus ~ .input-glow {
          width: 100%;
        }

        /* Inline field status. Flows in normal document order rather than being
           absolutely positioned: at 30px field spacing an absolute note would collide
           with the next label on a two-line message. */
        .mercury-wrapper .field-note {
          margin-top: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          line-height: 1.4;
        }

        .mercury-wrapper .field-note.error {
          color: #ff6b6b;
        }

        .mercury-wrapper .field-note.ok {
          color: #34d399;
        }

        .mercury-wrapper .field-note.checking {
          color: var(--text-dim);
        }

        .mercury-wrapper .suggest-link {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          color: var(--accent);
          text-decoration: underline;
        }

        .mercury-wrapper .auth-error {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: #ff6b6b;
          border-left: 2px solid #ff6b6b;
          padding: 8px 0 8px 12px;
          margin-bottom: 24px;
          background: rgba(255, 107, 107, 0.06);
        }

        .mercury-wrapper .resend-link {
          background: none;
          border: none;
          padding: 0 0 0 4px;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          color: #ff6b6b;
          text-decoration: underline;
        }

        .mercury-wrapper .resend-link:disabled {
          cursor: default;
          text-decoration: none;
          opacity: 0.75;
        }

        /* Mercury submit button */
        .mercury-wrapper .submit-wrap {
          margin-top: 40px;
          position: relative;
          filter: var(--filter-goo);
        }

        .mercury-wrapper .btn-base {
          background: var(--accent);
          color: #000;
          border: none;
          padding: 20px 40px;
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 2px;
          cursor: pointer;
          width: 100%;
          position: relative;
          z-index: 2;
          transition: letter-spacing 0.3s;
        }

        .mercury-wrapper .btn-base:hover:not(:disabled) {
          letter-spacing: 4px;
        }

        .mercury-wrapper .btn-base:disabled {
          cursor: default;
          opacity: 0.85;
        }

        .mercury-wrapper .mercury-drop {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          background: var(--mercury);
          transform: translate(-50%, -50%);
          z-index: 1;
          border-radius: 50px;
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .mercury-wrapper .submit-wrap:hover .mercury-drop {
          transform: translate(-50%, -50%) scale(1.05, 1.2);
          filter: brightness(1.2);
        }

        /* Footer */
        .mercury-wrapper .footer-nav {
          margin-top: 36px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 1px;
        }

        .mercury-wrapper .footer-nav .link-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          transition: color 0.3s;
        }

        .mercury-wrapper .footer-nav .link-btn:hover {
          color: var(--accent);
        }

        .mercury-wrapper .footer-tag {
          color: var(--text-dim);
        }

        .mercury-wrapper .svg-filter-hidden {
          position: absolute;
          width: 0;
          height: 0;
        }

        /* Phones: the 40px gutter and 3rem hero overflow a 360-390px screen. */
        @media (max-width: 480px) {
          .mercury-wrapper .auth-container {
            padding: 24px;
          }
          .mercury-wrapper .header {
            margin-bottom: 32px;
          }
          .mercury-wrapper .header h1 {
            font-size: 2.25rem;
            letter-spacing: -1px;
            margin-left: -2px;
          }
          .mercury-wrapper .form-group {
            margin-bottom: 24px;
          }
          /* The focus nudge shifts the field toward the edge on a narrow screen. */
          .mercury-wrapper .form-group:focus-within {
            transform: none;
          }
          .mercury-wrapper .btn-base {
            padding: 18px 24px;
          }
          .mercury-wrapper .footer-nav {
            gap: 12px;
          }
        }
      `}</style>

      <svg className="svg-filter-hidden">
        <defs>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="stage">
        {blobsData.map((data, index) => (
          <div
            key={index}
            ref={(el) => {
              blobRefs.current[index] = el;
            }}
            className="blob"
            style={{
              width: `${data.size}px`,
              height: `${data.size}px`,
              left: `${data.left}%`,
              top: `${data.top}%`,
              animationDelay: `${data.animationDelay}s`,
              animationDuration: `${data.animationDuration}s`,
            }}
          />
        ))}
      </div>

      <main className="auth-container">
        <header className="header">
          <span className="brand-id">AI Teaching Assistant</span>
          <h1>
            {heroTop}
            <br />
            {heroBottom}
          </h1>
        </header>

        <form autoComplete="on" noValidate onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="form-group">
              <label htmlFor="na-name">Name</label>
              <div className="input-wrap">
                <input
                  id="na-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => {
                    onNameChange(e.target.value);
                    clearWarning("name");
                  }}
                  aria-invalid={Boolean(warnings.name)}
                  required
                />
                <div className="input-glow" />
              </div>
              {warnings.name && (
                <div className="field-note error" role="alert">
                  {warnings.name}
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="na-email">Email</label>
            {/* The glow bar is anchored to the bottom of its positioned parent. It has
                to be scoped to the input, or the status message below pushes the field
                group taller and the bar drifts down under the text. */}
            <div className="input-wrap">
              <input
                id="na-email"
                type="email"
                autoComplete="email"
                placeholder="yourname@example.com"
                value={email}
                onChange={(e) => {
                  onEmailChange(e.target.value);
                  clearWarning("email");
                }}
                aria-invalid={emailState === "invalid" || Boolean(warnings.email)}
                aria-describedby="na-email-status"
                required
              />
              <div className="input-glow" />
            </div>

            <div id="na-email-status" role="status" aria-live="polite">
              {/* Skipped when the live checker already shows the same text, so a
                  malformed address at submit doesn't render the message twice. */}
              {warnings.email && warnings.email !== emailMessage && (
                <div className="field-note error" role="alert">
                  {warnings.email}
                </div>
              )}

              {emailState === "checking" && (
                <div className="field-note checking">Checking address…</div>
              )}

              {emailState === "invalid" && emailMessage && (
                <div className="field-note error">{emailMessage}</div>
              )}

              {emailState === "valid" && !suggestion && mode === "register" && (
                // "Address looks good" reports the domain check that passed; the second
                // half sets the honest expectation, since no check can prove a specific
                // Gmail/Outlook mailbox exists (providers accept-all to stop
                // enumeration) - the confirmation link is the real proof.
                <div className="field-note ok">
                  Address looks good, a confirmation link will be sent here
                </div>
              )}

              {suggestion && (
                <div className="field-note error">
                  Did you mean{" "}
                  <button
                    type="button"
                    className="suggest-link"
                    onClick={() => onEmailChange(suggestion)}
                  >
                    {suggestion}
                  </button>
                  ?
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="na-password">Password</label>
            <div className="input-wrap">
              <input
                id="na-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  onPasswordChange(e.target.value);
                  clearWarning("password");
                }}
                aria-invalid={Boolean(warnings.password)}
                required
              />
              <div className="input-glow" />
            </div>
            {warnings.password && (
              <div className="field-note error" role="alert">
                {warnings.password}
              </div>
            )}
          </div>

          {error && (
            <div className="auth-error">
              {error}
              {resendEmail && (
                <button
                  type="button"
                  className="resend-link"
                  disabled={resent}
                  onClick={() => {
                    void resendVerification(resendEmail);
                    setResent(true);
                  }}
                >
                  {resent ? "· link sent" : "· resend the link"}
                </button>
              )}
            </div>
          )}

          <div className="submit-wrap">
            <div className="mercury-drop" />
            {/* A malformed address can't succeed, so don't spend a round trip on it.
                A typo *suggestion* still submits - it might genuinely be their domain. */}
            <button
              type="submit"
              className="btn-base"
              disabled={loading || (mode === "register" && emailState === "invalid")}
            >
              {submitLabel}
            </button>
          </div>
        </form>

        <footer className="footer-nav">
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              // A lingering "full name" warning would point at a field that no
              // longer exists after switching to login mode.
              setWarnings({});
              onToggleMode();
            }}
          >
            {mode === "login" ? "Create an account" : "Have an account? Sign in"}
          </button>
          <span className="footer-tag">SECURE SESSION</span>
        </footer>
      </main>
    </div>
  );
}
