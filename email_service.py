import os
import resend

# Ensure you have RESEND_API_KEY set in your environment
resend.api_key = os.environ.get("RESEND_API_KEY", "re_dummy_key")

def send_cold_email(to_email: str, subject: str, html_body: str):
    """
    Sends a cold email to the target lead using the Resend API.
    """
    try:
        # Convert plain text newlines to HTML breaks if needed, assuming LLM outputs text formatting
        formatted_body = html_body.replace('\n', '<br>')
        
        params: resend.Emails.SendParams = {
            "from": "Acme Sales <onboarding@resend.dev>", # Replace with verified domain
            "to": [to_email],
            "subject": subject,
            "html": f"<p>{formatted_body}</p>",
        }
        
        email_response = resend.Emails.send(params)
        print(f"Successfully sent email! ID: {email_response['id']}")
        return email_response
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return None
