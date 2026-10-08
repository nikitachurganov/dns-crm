import type {CsvType} from '../types';

/**
 * Разбор CSV с поддержкой кавычек
 *
 * @param source Текст CSV
 */
export function parseCSV<T>(source: string): T[] {
	const rows: string[][] = [];
	let row: string[]      = [];
	let cell               = '';
	let quoted             = false;
	const text             = source.replace(/^﻿/, '');

	for (let i = 0; i < text.length; i++) {
		const c = text[i];

		if (quoted) {
			if ('"' === c) {
				if ('"' === text[i + 1]) {
					cell += '"';
					i++;
				} else {
					quoted = false;
				}
			} else {
				cell += c;
			}
		} else if ('"' === c) {
			quoted = true;
		} else if (',' === c) {
			row.push(cell);
			cell = '';
		} else if ('\n' === c) {
			row.push(cell);
			rows.push(row);
			row  = [];
			cell = '';
		} else if ('\r' !== c) {
			cell += c;
		}
	}

	if ('' !== cell || row.length) {
		row.push(cell);
		rows.push(row);
	}

	const head = (rows.shift() ?? []).map((h) => h.trim());

	return rows
		.filter((r) => 1 < r.length || r[0]?.trim())
		.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])) as T);
}

/**
 * Определение типа таблицы по заголовкам колонок
 *
 * @param rows Разобранные строки
 */
export function detectCsvType(rows: Record<string, string>[]): CsvType | null {
	if (!rows.length) {
		return null;
	}

	const head = Object.keys(rows[0] ?? {});
	const has  = (key: string) => head.includes(key);

	if (has('client_id') && has('ltv')) {
		return 'clients';
	}
	if (has('order_id') && has('items')) {
		return 'orders';
	}
	if (has('ticket_id') && has('topic')) {
		return 'tickets';
	}
	if (has('ticket_id') && has('sender')) {
		return 'messages';
	}
	if (has('chat_id') && has('unread')) {
		return 'chats';
	}

	return null;
}
