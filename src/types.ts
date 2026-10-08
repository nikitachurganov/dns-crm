/** Клиент */
export interface Client {
	client_id: string;
	name: string;
	phone: string;
	email: string;
	city: string;
	segment: string;
	status: string;
	channel: string;
	fav_store: string;
	pickup_method: string;
	timezone: string;
	bonus: string;
	prozapass_until: string;
	client_since: string;
	orders_count: string;
	ltv: string;
	avg_csat: string;
	tickets_count: string;
}

/** Заказ */
export interface Order {
	order_id: string;
	client_id: string;
	date: string;
	items: string;
	sku: string;
	amount: string;
	status: string;
	delivery: string;
	channel: string;
}

/** Тикет (sub-чат) */
export interface Ticket {
	ticket_id: string;
	client_id: string;
	order_id: string;
	date: string;
	topic: string;
	category: string;
	status: string;
	operator: string;
	csat: string;
	fcr: string;
	/** Оператор запросил подтверждение решения */
	closureReq?: boolean;
	/** Клиент ответил «Да» и оценивает работу */
	saidYes?: boolean;
}

/** Чат клиента */
export interface Chat {
	chat_id: string;
	client_id: string;
	status: string;
	unread: string;
	assigned_to: string;
	channel: string;
	online: string;
}

/** Сообщение */
export interface Message {
	message_id: string;
	ticket_id: string;
	ts: string;
	sender: string;
	type: string;
	text: string;
}

/** Все таблицы выгрузки */
export interface Db {
	clients: Client[];
	orders: Order[];
	tickets: Ticket[];
	chats: Chat[];
	messages: Message[];
}

export type CsvType = keyof Db;

export type ChatFilter = 'active' | 'waiting' | 'all';

export type ActionType = 'return' | 'exchange' | 'warranty' | 'transfer' | 'service';

export type ReplyTone = 'warm' | 'biz' | 'emp';

/** Действие AI-помощника */
export interface IntentAction {
	id: string;
	label: string;
	primary?: boolean;
}

/** Результат распознавания намерения */
export interface Intent {
	label: string;
	conf: number;
	note: string;
	actions: IntentAction[];
	replies: Record<ReplyTone, string>;
	kb: string[];
}

/** Уведомление */
export interface ToastItem {
	id: number;
	text: string;
	type: 'ok' | 'info';
}
