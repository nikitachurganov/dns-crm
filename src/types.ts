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
	/** Адрес доставки; в старых выгрузках колонки может не быть */
	address?: string;
	/** Цены позиций через «;» в том же порядке, что и товары в items; нет — цена только у заказа из одного товара */
	prices?: string;
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
	/** Приоритет: high — высокий, medium — средний, пусто — без приоритета (в старых выгрузках колонки может не быть) */
	priority?: string;
	/** Откуда пришло обращение: chat — чат на главной странице сайта, form — форма обратной связи (в старых выгрузках колонки может не быть — тогда чат) */
	source?: string;
	/** Тема обращения из категорий сайта (SITE_TOPICS); пока оператор не выбрал её, в шапке показывается краткая тема из topic */
	site_topic?: string;
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
	/** Оператор-автор: заполняется у сообщений прошлых операторов, у сообщений текущего пусто */
	author?: string;
	author_email?: string;
	/** Превью вложения-изображения (type = attachment): ссылка на blob, есть только у файлов, отправленных в этой сессии */
	preview?: string;
	/** Id отправки: вложения, отправленные одним нажатием «Отправить», показываются одной группой плиток */
	batch?: string;
}

/** Файл, отправляемый оператором: имя и превью, если это изображение */
export interface OutgoingFile {
	name: string;
	previewUrl?: string;
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

/** Канал поступления тикета: чат на главной странице сайта или форма обратной связи */
export type TicketSource = 'chat' | 'form';

export type ActionType = 'return' | 'exchange' | 'warranty' | 'transfer' | 'service' | 'reschedule' | 'cancel' | 'receipt';

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
