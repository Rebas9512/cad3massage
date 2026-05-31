// Staff WeChat nudge content. Deliberately PII-FREE — no customer name / phone /
// email (those transit a third party otherwise). Just service, time, and the
// confirmation code so staff can look it up; full detail stays in email + console.
import { formatInTimeZone } from 'date-fns-tz';
import { STUDIO_TZ } from '@cad3/shared';
import type { WeChatMessage } from './provider.ts';
import type { BookingEmailData } from '../email/render.ts';

const fmt = (d: Date) => formatInTimeZone(d, STUDIO_TZ, 'EEE MMM d · h:mm a zzz');

export function staffAlertNudge(d: BookingEmailData, kind: 'new' | 'cancelled'): WeChatMessage {
  const title = kind === 'new' ? '🆕 新预约 New booking' : '❌ 预约取消 Cancelled';
  const content = [
    `${d.serviceName} (${d.serviceCode})`,
    fmt(d.startAt),
    `Code: ${d.confirmationCode}`,
    '',
    '详情见邮件 / Staff 后台',
  ].join('\n');
  return { title, content };
}
