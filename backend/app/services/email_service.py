"""Transactional email over SMTP (Gmail by default).

Sending is best-effort and always runs in a background task: a slow or failing mail
server must never make signup itself fail or hang. Failures are logged, and the user
can always request a new link via /auth/resend-verification.
"""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)


def _send(to: str, subject: str, text_body: str, html_body: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
    msg["To"] = to
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        smtp.starttls()
        smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)


def send_verification_email(to: str, name: str, verify_url: str) -> None:
    """Email the signup confirmation link. Never raises — signup must not fail on SMTP."""
    if not settings.email_enabled:
        logger.info("SMTP not configured — skipping verification email to %s", to)
        return

    subject = "Confirm your email · AI Teaching Assistant"
    hours = settings.verification_token_expire_hours
    text_body = (
        f"Hi {name},\n\n"
        "Confirm your email address to activate your AI Teaching Assistant account:\n\n"
        f"{verify_url}\n\n"
        f"This link expires in {hours} hours.\n\n"
        "If you didn't create this account, you can ignore this email."
    )
    html_body = f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#050505;
               font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;color:#ededed;">
    <div style="max-width:480px;margin:0 auto;background:#0e0e10;border:1px solid rgba(255,255,255,0.1);
                border-radius:14px;padding:32px;">
      <p style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.16em;
                text-transform:uppercase;color:#8a8a92;margin:0 0 12px;">
        AI Teaching Assistant
      </p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:#fff;">Confirm your email</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#c9c9d1;">
        Hi {name}, confirm your email address to activate your account.
      </p>
      <a href="{verify_url}"
         style="display:inline-block;background:#fafafa;color:#0a0a0a;text-decoration:none;
                font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;">
        Confirm email
      </a>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#8a8a92;">
        This link expires in {hours} hours. If the button doesn't work, paste this into your browser:<br>
        <span style="color:#c9c9d1;word-break:break-all;">{verify_url}</span>
      </p>
      <p style="margin:20px 0 0;font-size:12px;color:#6b6b73;">
        If you didn't create this account, you can ignore this email.
      </p>
    </div>
  </body>
</html>"""

    try:
        _send(to, subject, text_body, html_body)
        logger.info("Verification email sent to %s", to)
    except Exception as exc:  # noqa: BLE001 - never let email break signup
        logger.error("Failed to send verification email to %s: %s", to, exc)
