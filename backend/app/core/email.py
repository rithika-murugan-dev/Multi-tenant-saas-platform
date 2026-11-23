import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings


def send_real_email(recipient: str, subject: str, body_text: str) -> bool:
    """
    Sends a real transactional email over SMTP.
    Uses Port 465 (Direct SSL) with fallback to Port 587 (STARTTLS).
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n[SMTP Notice] No SMTP_USER and SMTP_PASSWORD configured in .env.")
        print(f" Simulating email to: {recipient}")
        print(f" Subject: {subject}")
        print(f" Body:\n{body_text}\n")
        return False

    sender_email = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER
    clean_password = settings.SMTP_PASSWORD.replace(" ", "").strip()

    # Create MIME email message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAILS_FROM_NAME} <{sender_email}>"
    msg["To"] = recipient

    # HTML formatted email body
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
        .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }}
        .header {{ border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; }}
        .title {{ font-size: 20px; font-weight: bold; color: #0f172a; margin: 0; }}
        .content {{ font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; }}
        .footer {{ margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">WorkFlow Pro Notification</h1>
        </div>
        <div class="content">{body_text}</div>
        <div class="footer">
          This is an automated notification from WorkFlow Pro Helpdesk & Business Operations.
        </div>
      </div>
    </body>
    </html>
    """

    msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    context = ssl.create_default_context()

    # 1. Primary Attempt: Port 465 (Direct SSL) - Standard for Gmail & bypasses ISP blocks
    try:
        print(f"[SMTP] Connecting to {settings.SMTP_HOST}:465 via direct SSL as {sender_email}...")
        with smtplib.SMTP_SSL(settings.SMTP_HOST, 465, context=context, timeout=15) as server:
            server.login(settings.SMTP_USER, clean_password)
            server.sendmail(sender_email, recipient, msg.as_string())
        print(f" [SMTP SUCCESS] Real email delivered to {recipient} via Port 465 (SSL)!")
        return True
    except Exception as e465:
        print(f"[SMTP Port 465 Error]: {e465}. Trying Port 587 (STARTTLS)...")

    # 2. Secondary Fallback: Port 587 (STARTTLS)
    try:
        with smtplib.SMTP(settings.SMTP_HOST, 587, timeout=15) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(settings.SMTP_USER, clean_password)
            server.sendmail(sender_email, recipient, msg.as_string())
        print(f" [SMTP SUCCESS] Real email delivered to {recipient} via Port 587!")
        return True
    except Exception as e587:
        print(f" [SMTP ERROR] Failed to send email to {recipient}: {e587}")
        return False
