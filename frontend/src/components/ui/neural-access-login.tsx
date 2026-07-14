import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { resendVerification } from "../../services/api";

// Practical rather than RFC-exhaustive: the backend does the authoritative check
// (including an MX lookup). This exists to catch a typo before a round trip.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Domains people fat-finger constantly. The backend's MX check rejects these, but
 *  only after submitting — catching them here turns a failed signup into one click. */
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
  /** Set when login failed because the account is unverified — offers a resend link. */
  resendEmail?: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onToggleMode: () => void;
}

/**
 * Liquid-mercury login surface. Presentational only — all auth state and the submit
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
  // Don't scold someone mid-keystroke: "a@" is not yet a mistake. The warning appears
  // once they pause typing, or as soon as they leave the field.
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [emailSettled, setEmailSettled] = useState(false);

  useEffect(() => {
    setEmailSettled(false);
    if (!email) return;
    const t = setTimeout(() => setEmailSettled(true), 700);
    return () => clearTimeout(t);
  }, [email]);

  const emailIssue = inspectEmail(email);
  const showEmailIssue =
    (emailBlurred || emailSettled) && (emailIssue.error || emailIssue.suggestion);
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

  const heroTop = mode === "login" ? "WELCOME" : "REQUEST";
  const heroBottom = mode === "login" ? "BACK" : "ACCESS";
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

        /* Inline field warning. Flows in normal document order rather than being
           absolutely positioned: at 30px field spacing an absolute note would collide
           with the next label on a two-line message. */
        .mercury-wrapper .field-note {
          margin-top: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          line-height: 1.4;
          color: #ffb86b;
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

        <form autoComplete="on" onSubmit={onSubmit}>
          {mode === "register" && (
            <div className="form-group">
              <label htmlFor="na-name">Full Name</label>
              <input
                id="na-name"
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                required
              />
              <div className="input-glow" />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="na-email">Email</label>
            <input
              id="na-email"
              type="email"
              autoComplete="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              onBlur={() => setEmailBlurred(true)}
              aria-invalid={Boolean(emailIssue.error)}
              aria-describedby={showEmailIssue ? "na-email-issue" : undefined}
              required
            />
            <div className="input-glow" />

            {showEmailIssue && (
              <div id="na-email-issue" className="field-note" role="status">
                {emailIssue.error ? (
                  emailIssue.error
                ) : (
                  <>
                    Did you mean{" "}
                    <button
                      type="button"
                      className="suggest-link"
                      onClick={() => {
                        onEmailChange(emailIssue.suggestion!);
                        setEmailBlurred(false);
                      }}
                    >
                      {emailIssue.suggestion}
                    </button>
                    ?
                  </>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="na-password">Password</label>
            <input
              id="na-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              required
            />
            <div className="input-glow" />
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
                A typo *suggestion* still submits — it might genuinely be their domain. */}
            <button
              type="submit"
              className="btn-base"
              disabled={loading || Boolean(emailIssue.error)}
            >
              {submitLabel}
            </button>
          </div>
        </form>

        <footer className="footer-nav">
          <button type="button" className="link-btn" onClick={onToggleMode}>
            {mode === "login" ? "Create an account" : "Have an account? Sign in"}
          </button>
          <span className="footer-tag">SECURE SESSION</span>
        </footer>
      </main>
    </div>
  );
}
