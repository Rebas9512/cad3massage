// WeChat staff-push transport via PushPlus. Console by default (local/test —
// nothing leaves the machine); real HTTP push when WECHAT_ENABLED + token set.
// fetch-based → runs on Node and Cloudflare Workers. PII never goes here — only
// a minimal heads-up nudge (see wechat/render.ts); full detail stays in email.
import { ENV } from '../../env.ts';

export interface WeChatMessage {
  title: string;
  content: string;
}
export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface WeChatProvider {
  readonly name: string;
  send(msg: WeChatMessage): Promise<SendResult>;
}

const ConsoleWeChatProvider: WeChatProvider = {
  name: 'console',
  async send(msg) {
    console.log(`\n💬 [console-wechat] ${msg.title}\n   ${msg.content.replace(/\n/g, '\n   ')}\n   (WECHAT_ENABLED=false — not actually pushed)`);
    return { ok: true, id: 'console' };
  },
};

class PushPlusProvider implements WeChatProvider {
  readonly name = 'pushplus';
  async send(msg: WeChatMessage): Promise<SendResult> {
    try {
      const res = await fetch('https://www.pushplus.plus/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: ENV.PUSHPLUS_TOKEN,
          title: msg.title,
          content: msg.content,
          template: 'txt',
          channel: 'wechat',
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { code?: number; msg?: string; data?: string };
      // PushPlus returns 200 on accept (async — not a delivery guarantee).
      if (!res.ok || body.code !== 200) return { ok: false, error: body.msg ?? `HTTP ${res.status}` };
      return { ok: true, id: body.data };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

export const wechatProvider: WeChatProvider = ENV.WECHAT_ENABLED ? new PushPlusProvider() : ConsoleWeChatProvider;
