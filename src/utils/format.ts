/** «Сегодня» в демо-данных */
export const TODAY = '10.07.2026';

const AVATAR_COLORS = ['#8b5cf6', '#0ea5e9', '#14b8a6', '#ec4899', '#f59e0b', '#6366f1', '#ef4444', '#10b981'];

const MONTHS = ['', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/** Деньги: 52 990 ₽ */
export function money(value: string | number): string {
	const n = Number(String(value).replace(/\s/g, '')) || 0;

	return n.toLocaleString('ru-RU') + ' ₽';
}

/** Сокращённые деньги: 487к */
export function kMoney(value: string | number): string {
	const n = Number(value) || 0;

	return 1000 <= n ? Math.round(n / 1000) + 'к' : String(n);
}

/** Дата из «дд.мм.гггг чч:мм» */
export function datePart(ts?: string): string {
	return (ts ?? '').split(' ')[0] ?? '';
}

/** Время из «дд.мм.гггг чч:мм» */
export function timePart(ts?: string): string {
	return (ts ?? '').split(' ')[1] ?? '';
}

/** Время для сегодняшних сообщений, иначе дата «дд.мм» */
export function shortTime(ts?: string): string {
	return TODAY === datePart(ts) ? timePart(ts) : datePart(ts).slice(0, 5);
}

/** «сегодня, 12:35» или дата */
export function longTime(ts?: string): string {
	if (TODAY !== datePart(ts)) {
		return datePart(ts);
	}

	const t = timePart(ts);

	return t ? 'сегодня, ' + t : 'сегодня';
}

/** Ключ для сортировки по дате */
export function dateKey(ts?: string): string {
	const [d, m, y] = datePart(ts).split('.');

	return `${y}${m}${d}${timePart(ts).replace(':', '') || '0000'}`;
}

/** Имя из «Имя Фамилия» */
export function firstName(full?: string): string {
	return (full ?? '').split(' ')[0] ?? '';
}

/** Инициалы */
export function initials(full?: string): string {
	return (full || '?').split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

/** «Мария П.» */
export function shortName(full?: string): string {
	const [first = '', last = ''] = (full ?? '').split(' ');

	return last ? `${first} ${last[0]}.` : first;
}

/** Цвет аватара по имени */
export function avatarColor(name?: string): string {
	let h = 0;

	for (const ch of name ?? '') {
		h = (h * 31 + (ch.codePointAt(0) ?? 0)) % 997;
	}

	return AVATAR_COLORS[h % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!;
}

/** Текущее время во Владивостоке (GMT+10) в «сегодняшнем» дне */
export function nowTs(): string {
	const d = new Date(Date.now() + 10 * 3600e3);

	return `${TODAY} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** «03.2021» → «марта 2021» */
export function monthName(mmyyyy?: string): string {
	const [m, y] = (mmyyyy ?? '').split('.');

	return `${MONTHS[Number(m)] ?? ''} ${y ?? ''}`;
}

/** Звёзды рейтинга */
export function starStr(n: string | number): string {
	const v = Number(n) || 0;

	return '★'.repeat(v) + '☆'.repeat(5 - v);
}

/** Краткая тема тикета (до двоеточия) */
export function shortTopic(topic?: string): string {
	return (topic ?? '').split(':')[0] ?? '';
}
