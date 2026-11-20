# backend/app/core/email_utils.py
"""SMTP email sender with a safe log-only fallback when SMTP is not configured."""
import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("projectmatrix.email")

SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587") or 587)
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM = os.getenv("SMTP_FROM", "").strip() or SMTP_USER
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")


def smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def send_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> dict:
    """Returns {"sent": bool, "fallback": bool}. Never raises on SMTP failure."""
    if not smtp_configured():
        logger.warning("SMTP not configured. Email to %s NOT sent. Subject: %s", to_email, subject)
        logger.warning("EMAIL BODY (fallback log):\n%s", text_body or html_body)
        return {"sent": False, "fallback": True}

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            if SMTP_USE_TLS:
                server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to_email], msg.as_string())
        logger.info("Email sent to %s", to_email)
        return {"sent": True, "fallback": False}
    except Exception as e:  # noqa: BLE001
        logger.error("SMTP send failed to %s: %s", to_email, e)
        logger.warning("EMAIL BODY (fallback log after failure):\n%s", text_body or html_body)
        return {"sent": False, "fallback": True}
