// Pluggable email transport. ConsoleProvider (default, local/test — nothing
// leaves the machine) vs ResendProvider (real HTTP send, used when EMAIL_ENABLED
// and a key are set). Both run on Node and Cloudflare Workers (fetch-based).
import { ENV } from '../../env.ts';
import type { EmailContent } from './render.ts';

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(to: string, content: EmailContent): Promise<SendResult>;
}

const ConsoleProvider: EmailProvider = {
  name: 'console',
  async send(to, content) {
    console.log(`\n📧 [console-email] → ${to}\n   subject: ${content.subject}\n   (EMAIL_ENABLED=false — not actually sent)`);
    return { ok: true, id: 'console' };
  },
};

class ResendProvider implements EmailProvider {
  readonly name = 'resend';
  async send(to: string, content: EmailContent): Promise<SendResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${ENV.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: ENV.EMAIL_FROM, to, subject: content.subject, html: content.html, text: content.text }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
      if (!res.ok) return { ok: false, error: body.message ?? body.name ?? `HTTP ${res.status}` };
      return { ok: true, id: body.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

export const emailProvider: EmailProvider = ENV.EMAIL_ENABLED ? new ResendProvider() : ConsoleProvider;
