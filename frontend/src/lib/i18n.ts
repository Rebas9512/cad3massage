import { useSyncExternalStore } from 'react';

// Lightweight i18n for the STAFF console only (customer site stays English).
// The therapist is a Chinese speaker and manages bookings in 中文.
export type Lang = 'en' | 'zh';
const KEY = 'cad3_staff_lang';

let current: Lang = ((): Lang => {
  try { return (localStorage.getItem(KEY) as Lang) === 'zh' ? 'zh' : 'en'; } catch { return 'en'; }
})();
const subs = new Set<() => void>();

export const getLang = (): Lang => current;
export function setLang(l: Lang) {
  current = l;
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  subs.forEach((f) => f());
}
function subscribe(cb: () => void) { subs.add(cb); return () => { subs.delete(cb); }; }
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang);
}

// [en, zh]
const DICT: Record<string, [string, string]> = {
  // layout
  'nav.schedule': ['Schedule', '排班'],
  'nav.hours': ['Hours', '工作时间'],
  'nav.timeoff': ['Time Off', '休息时间'],
  'nav.logout': ['Log out', '退出登录'],

  // login
  'login.welcome': ['Welcome back', '欢迎回来'],
  'login.sub': ['Sign in to manage your schedule and bookings.', '登录以管理你的排班与预约。'],
  'login.email': ['Email', '邮箱'],
  'login.password': ['Password', '密码'],
  'login.signin': ['Sign in', '登录'],
  'login.signingin': ['Signing in…', '登录中…'],
  'login.error': ['Invalid email or password.', '邮箱或密码错误。'],
  'login.note': ["Accounts are created by the studio — there's no public sign-up.", '账号由工作室创建，不提供公开注册。'],
  'login.tz': ['Central time', '中部时间'],
  'login.showpw': ['Show password', '显示密码'],
  'login.hidepw': ['Hide password', '隐藏密码'],

  // schedule toolbar / stats
  'sch.today': ['Today', '今天'],
  'sch.day': ['Day', '日'],
  'sch.week': ['Week', '周'],
  'sch.month': ['Month', '月'],
  'sch.newbooking': ['New booking', '新建预约'],
  'sch.timeoff': ['Time off', '休息时间'],
  'sch.appointments': ['appointments', '预约'],
  'sch.completed': ['completed', '已完成'],
  'sch.noshow': ['no-show', '未到'],
  'sch.booked': ['booked', '营收'],
  'sch.prevday': ['Previous day', '前一天'],
  'sch.nextday': ['Next day', '后一天'],
  'sch.searchph': ['Find by code (e.g. CAD3-ABCDE)', '按确认码查找（如 CAD3-ABCDE）'],
  'sch.notfound': ['No booking with that code.', '找不到该确认码的预约。'],

  // schedule body
  'sch.loading': ['Loading…', '加载中…'],
  'sch.loaderr': ['Couldn’t load the schedule.', '无法加载排班。'],
  'sch.retry': ['Try again', '重试'],
  'sch.empty': ['No appointments this day — open {open}–{close}.', '当天暂无预约 — 营业 {open}–{close}。'],
  'sch.appts': ['{n} appts', '{n} 个预约'],
  'sch.more': ['+{n} more', '+{n} 更多'],

  // detail
  'd.title': ['Booking details', '预约详情'],
  'd.online': ['Booked online', '线上预约'],
  'd.staff': ['Added by staff', '手动录入'],
  'd.code': ['Code', '确认码'],
  'd.service': ['Service', '服务'],
  'd.when': ['When', '日期'],
  'd.time': ['Time', '时间'],
  'd.total': ['Total', '合计'],
  'd.payinperson': ['pay in person', '到店支付'],
  'd.notes': ['Notes', '备注'],
  'd.noshowflag': ['Previously no-showed {n}×', '曾爽约 {n} 次'],
  'sch.noshowflag': ['Previously no-showed', '曾爽约'],
  'd.complete': ['Mark completed', '标记完成'],
  'd.reschedule': ['Reschedule', '改期'],
  'd.noshow': ['No-show', '未到'],
  'd.cancel': ['Cancel booking', '取消预约'],
  'd.confirmcancel': ['Cancel this booking?', '确定取消该预约？'],
  'd.cancelbody': ['This frees the time slot. You can’t undo this here.', '将释放该时段，且无法在此撤销。'],
  'd.keep': ['Keep it', '不取消'],
  'd.confirmyes': ['Cancel booking', '确认取消'],
  'd.close': ['Close', '关闭'],

  // statuses
  'st.confirmed': ['Confirmed', '已确认'],
  'st.completed': ['Completed', '已完成'],
  'st.no_show': ['No-show', '未到'],
  'st.cancelled': ['Cancelled', '已取消'],

  // new booking
  'nb.title': ['New booking', '新建预约'],
  'nb.service': ['Service', '服务'],
  'nb.datetime': ['Date & time', '日期与时间'],
  'nb.name': ['Customer name', '客户姓名'],
  'nb.phone': ['Phone (optional)', '电话（选填）'],
  'nb.email': ['Email (optional)', '邮箱（选填）'],
  'nb.note': ['Note (optional)', '备注（选填）'],
  'nb.create': ['Create booking', '创建预约'],
  'nb.creating': ['Creating…', '创建中…'],
  'nb.required': ['Pick a service, a time, and enter a name.', '请选择服务、时间并填写姓名。'],
  'nb.selectservice': ['Select a service…', '选择服务…'],
  'nb.b2b': ['Back-to-back (no 30-min buffer)', '连续预约（取消 30 分钟缓冲）'],
  'nb.b2bhint': ['Drops the post-session gap so this booking can sit flush against another. Use for true back-to-back appointments.', '取消预约后的间隔，让这单可以与另一单无缝相接。用于真正的连续预约。'],
  'nb.walkin': ['Walk-in / last-minute (skip 1-hour notice)', '临时预约（忽略提前 1 小时）'],
  'nb.walkinhint': ['Offers times within the next hour for genuine walk-ins or phone bookings. The public site still requires 1 hour’s notice.', '显示未来 1 小时内的时段，用于真正的临时到店或电话预约。公开网站仍需提前 1 小时。'],

  // slot picker
  'sp.selecttime': ['Select a time…', '选择时间…'],
  'sp.pickdate': ['Select a date first…', '请先选择日期…'],
  'sp.loading': ['Loading times…', '加载可约时间…'],
  'sp.none': ['No open times in the next 30 days.', '未来 30 天没有可约时间。'],
  'sp.noneday': ['No open times on this date — pick another date, or adjust the options above.', '该日期没有可选时段——请换个日期，或调整上面的选项。'],

  // reschedule
  'rs.title': ['Reschedule', '改期'],
  'rs.current': ['{svc} · {min} min. Currently {when}.', '{svc} · {min} 分钟。当前：{when}。'],
  'rs.move': ['Move appointment', '移动预约'],
  'rs.saving': ['Saving…', '保存中…'],
  'rs.err': ['Could not reschedule. Try again.', '改期失败，请重试。'],

  // shared errors
  'err.conflict': ['That time overlaps another booking. Pick another.', '该时间与其他预约冲突，请另选。'],
  'err.create': ['Could not create the booking. Check the details.', '创建失败，请检查填写信息。'],

  // working hours
  'wh.title': ['Working Hours', '工作时间'],
  'wh.sub': ['Your weekly availability template (Central time).', '每周可约时间模板（中部时间）。'],
  'wh.closed': ['Closed', '休息'],
  'wh.save': ['Save changes', '保存'],
  'wh.saved': ['Saved ✓', '已保存 ✓'],
  'wh.saveerr': ['Couldn’t save — try again.', '保存失败，请重试。'],

  // time off
  'to.title': ['Time Off', '休息时间'],
  'to.sub': ['Block off vacation, breaks, or anything that should stop bookings.', '屏蔽休假、休息等不接受预约的时间段。'],
  'to.start': ['Start', '开始'],
  'to.end': ['End', '结束'],
  'to.reason': ['Reason (optional)', '事由（选填）'],
  'to.add': ['Add time off', '添加休息'],
  'to.none': ['No time off scheduled.', '暂无休息安排。'],
  'to.remove': ['Remove', '删除'],
  'to.invalid': ['Please pick a valid start and end.', '请选择有效的开始与结束时间。'],
  'to.subgantt': ['Drag on the timeline to select an open range, then add. Drag the handles to adjust. No overlap with bookings or existing time off.', '在时间轴上拖动选一段空闲时间再添加，拖上下把手可调整。不能与预约或已有休息重叠。'],
  'to.booked': ['Booked', '已约'],
  'to.overlap': ['That range overlaps a booking or existing time off — pick an open slot.', '该时段与预约或已有休息重叠，请另选空闲时段。'],
  'to.closed': ['Closed this day — no hours to block.', '当天休息，无需屏蔽。'],
  'to.newblock': ['New time off', '新休息'],
  'to.add2': ['Add', '添加'],
  'to.existing': ['Scheduled time off', '已安排的休息'],
};

const DAYS: Record<Lang, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
};
export const dayLabel = (dow: number, lang: Lang) => DAYS[lang][dow] ?? '';

export function useT() {
  const l = useLang();
  return (key: string, vars?: Record<string, string | number>) => {
    const pair = DICT[key];
    let s = pair ? pair[l === 'zh' ? 1 : 0] : key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}
