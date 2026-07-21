import log from '@/lib/logger';

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your-resend-key')) {
    log.warn({ to: params.to, subject: params.subject }, 'RESEND_API_KEY is not configured. Email notification skipped.');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'ClaimAppealPro <notifications@claimappealpro.com>',
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      log.error({ to: params.to, status: res.status, errText }, 'Failed to send email via Resend API');
      return false;
    }

    log.info({ to: params.to, subject: params.subject }, 'Email sent successfully via Resend');
    return true;
  } catch (error: any) {
    log.error({ to: params.to, error: error.message }, 'Error sending email via Resend');
    return false;
  }
}
