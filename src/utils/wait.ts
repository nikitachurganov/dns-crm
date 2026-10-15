import type {Message} from '../types';
import {datePart, timePart} from './format';

/** Сколько часов тикет без ответа оператора считается «висящим» (жёлтые часы) — N */
export const WAIT_WARNING_HOURS = 2;

/** Сколько часов тикет без ответа оператора считается просроченным (красные часы) — M, M > N */
export const WAIT_CRITICAL_HOURS = 4;

/** Уровень ожидания ответа */
export type WaitLevel = 'new' | 'warning' | 'critical';

export interface TicketWait {
	level: WaitLevel;
	/** Сколько полных часов клиент ждёт ответа */
	hours: number;
	/** Клиент ждёт ответа: последнее сообщение от него; иначе оператор уже ответил (или переписки ещё нет) */
	isWaiting: boolean;
}

/** Подпись ожидания для подсказки: «Ждёт ответа 3 ч», «Ждёт ответа меньше часа», «Оператор уже ответил» */
export function waitLabel(wait: TicketWait): string {
	if (!wait.isWaiting) {
		return 'Оператор уже ответил';
	}

	return 1 > wait.hours ? 'Ждёт ответа меньше часа' : `Ждёт ответа ${wait.hours} ч`;
}

/** «дд.мм.гггг чч:мм» → минуты от начала эпохи (без часовых поясов — сравниваются только между собой) */
function toMinutes(ts: string): number {
	const [d = '0', m = '0', y = '0'] = datePart(ts).split('.');
	const [hh = '0', mm = '0'] = timePart(ts).split(':');

	return Math.floor(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm)) / 60000);
}

/**
 * Состояние ожидания ответа по переписке тикета:
 * - новое сообщение — серые часы: клиент написал недавно или оператор уже ответил;
 * - жёлтые — клиент ждёт не меньше N часов;
 * - красные — клиент ждёт не меньше M часов.
 *
 * @param messages Сообщения тикета по порядку
 * @param now Текущее время «дд.мм.гггг чч:мм»
 */
export function ticketWait(messages: Message[], now: string): TicketWait {
	const list = messages.filter((m) => 'client' === m.sender || 'operator' === m.sender);
	const last = list.slice(-1)[0];

	// Оператор уже ответил — клиент ничего не ждёт
	if (!last || 'client' !== last.sender) {
		return {level: 'new', hours: 0, isWaiting: false};
	}

	// Ожидание считается с первого сообщения клиента в последней непрерывной серии без ответа
	let start = last;

	for (let i = list.length - 1; 0 <= i && 'client' === list[i]?.sender; i--) {
		start = list[i] as Message;
	}

	const hours = Math.max(0, Math.floor((toMinutes(now) - toMinutes(start.ts)) / 60));

	if (hours >= WAIT_CRITICAL_HOURS) {
		return {level: 'critical', hours, isWaiting: true};
	}

	return hours >= WAIT_WARNING_HOURS ? {level: 'warning', hours, isWaiting: true} : {level: 'new', hours, isWaiting: true};
}
