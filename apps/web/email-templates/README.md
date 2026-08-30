# Phoenix confirmation email

In Supabase, open **Authentication → Email Templates → Confirm signup**.

- Subject: `Ihr Phoenix Bestätigungscode`
- Paste the contents of `confirm-signup.html` into the message editor.
- Keep `{{ .Token }}` in the template. Supabase replaces it with the eight-digit verification code the Phoenix confirmation screen verifies.

To choose the sender address, open **Authentication → Settings → SMTP Settings**, enable Custom SMTP, and enter your mail provider's verified SMTP credentials and `From` address, for example `Phoenix <security@yourdomain.com>`. Supabase's default SMTP service cannot be branded for production use.
