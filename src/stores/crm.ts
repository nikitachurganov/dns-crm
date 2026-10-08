import {defineStore} from 'pinia';
import {computed, reactive, ref} from 'vue';
import {DEMO_CSV} from '../data/demo';
import type {ActionType, Chat, ChatFilter, Client, CsvType, Db, Intent, Message, Order, Ticket, ToastItem} from '../types';
import {detectCsvType, parseCSV} from '../utils/csv';
import {dateKey, firstName, nowTs} from '../utils/format';
import {detectIntent} from '../utils/intent';

/** Результат загрузки одного CSV-файла */
export interface CsvResult {
	fileName: string;
	type: CsvType | null;
	rows: number;
	error: boolean;
}

/** Данные формы подтверждения действия */
export interface ActionForm {
	orderId: string;
	way: string;
	time: string;
	swap: string;
}

const TABLES: CsvType[] = ['clients', 'orders', 'tickets', 'chats', 'messages'];

/** Хранилище CRM: данные выгрузки, выбранный чат/тикет и все действия оператора */
export const useCrmStore = defineStore('crm', () => {
	const db = reactive<Db>({clients: [], orders: [], tickets: [], chats: [], messages: []});

	const chatId       = ref<string | null>(null);
	const ticketId     = ref<string | null>(null);
	const expanded     = reactive<Record<string, boolean>>({});
	const filter       = ref<ChatFilter>('active');
	const draft        = ref('');
	const toasts       = ref<ToastItem[]>([]);
	const actionType   = ref<ActionType | null>(null);
	const client360Id  = ref<string | null>(null);
	const isCsvOpen    = ref(false);
	const csvResults   = ref<CsvResult[]>([]);
	const loadedFiles  = ref(0);
	let msgSeq         = 1000;
	let toastSeq       = 0;

	// ---------- выборки ----------
	const clientById      = (id: string) => db.clients.find((c) => c.client_id === id);
	const chatById        = (id: string | null) => db.chats.find((c) => c.chat_id === id);
	const ticketById      = (id: string | null) => db.tickets.find((t) => t.ticket_id === id);
	const clientOfChat    = (chat: Chat) => clientById(chat.client_id);
	const messagesOf      = (tid: string | null) => db.messages.filter((m) => m.ticket_id === tid);
	const ordersOf        = (cid: string) => db.orders.filter((o) => o.client_id === cid);
	const ticketsOf       = (cid: string) => db.tickets.filter((t) => t.client_id === cid);
	const ordersSorted    = (cid: string) => ordersOf(cid).slice().sort((a, b) => dateKey(b.date).localeCompare(dateKey(a.date)));
	/** Sub-чаты клиента, новые сверху */
	const ticketsSorted   = (cid: string) => ticketsOf(cid).slice().sort((a, b) => dateKey(b.date).localeCompare(dateKey(a.date)));

	/**
	 * Последнее сообщение клиента по всем его тикетам
	 *
	 * @param cid Id клиента
	 */
	function lastMessage(cid: string): Message | undefined {
		const ids = new Set(ticketsOf(cid).map((t) => t.ticket_id));

		return db.messages
			.filter((m) => ids.has(m.ticket_id))
			.sort((a, b) => dateKey(a.ts).localeCompare(dateKey(b.ts)))
			.slice(-1)[0];
	}

	const chat    = computed(() => chatById(chatId.value));
	const client  = computed<Client | undefined>(() => (chat.value ? clientOfChat(chat.value) : undefined));
	const ticket  = computed(() => ticketById(ticketId.value));
	const isClosed = computed(() => 'решено' === ticket.value?.status);

	/** Намерение клиента по сообщениям выбранного тикета */
	const intent = computed<Intent | null>(() => {
		if (!chat.value) {
			return null;
		}

		const t        = ticket.value;
		const orders   = ordersOf(chat.value.client_id);
		const order    = db.orders.find((o) => o.order_id === t?.order_id) ?? orders.find((o) => 'проблема' === o.status) ?? orders[0];
		const clientText = messagesOf(ticketId.value).filter((m) => 'client' === m.sender).map((m) => m.text).join(' \n ');

		return detectIntent({
			name:       firstName(client.value?.name),
			clientText,
			orderId:    order?.order_id ?? '—',
		});
	});

	/** Чаты очереди с учётом фильтра и поиска */
	const queue = computed(() => {
		let chats = db.chats.slice();

		if ('all' !== filter.value) {
			chats = chats.filter((c) => c.status === filter.value);
		}

		return chats.sort((a, b) => dateKey(lastMessage(b.client_id)?.ts).localeCompare(dateKey(lastMessage(a.client_id)?.ts)));
	});

	// ---------- уведомления ----------
	function toast(text: string, type: ToastItem['type'] = 'ok') {
		const id = ++toastSeq;

		toasts.value.push({id, text, type});
		setTimeout(() => dismissToast(id), 3400);
	}

	function dismissToast(id: number) {
		toasts.value = toasts.value.filter((t) => t.id !== id);
	}

	// ---------- навигация ----------
	/** Выбрать активный sub-чат: свежайший открытый тикет, иначе просто свежайший */
	function setActiveTicket(cid: string) {
		const list = ticketsSorted(cid);

		ticketId.value = (list.find((t) => 'решено' !== t.status) ?? list[0])?.ticket_id ?? null;
	}

	function selectChat(id: string) {
		chatId.value    = id;
		expanded[id]    = true;

		const c = chatById(id);

		if (c) {
			c.unread = '0';
			setActiveTicket(c.client_id);
		}
	}

	function selectSub(cid: string, tid: string) {
		chatId.value   = cid;
		ticketId.value = tid;

		const c = chatById(cid);

		if (c) {
			c.unread = '0';
		}
	}

	function toggleExpanded(id: string) {
		expanded[id] = !expanded[id];
	}

	// ---------- данные ----------
	function loadDemo() {
		for (const table of TABLES) {
			(db[table] as unknown[]) = parseCSV(DEMO_CSV[table] ?? '');
		}
		resetSelection();
	}

	function resetSelection() {
		const first = db.chats[0];

		chatId.value = first?.chat_id ?? null;

		for (const key of Object.keys(expanded)) {
			delete expanded[key];
		}

		if (first) {
			expanded[first.chat_id] = true;
			setActiveTicket(first.client_id);
		}
	}

	function restoreDemo() {
		loadDemo();
		loadedFiles.value = 0;
		csvResults.value  = [];
		toast('Демо-данные восстановлены', 'info');
	}

	/**
	 * Загрузка CSV-файлов выгрузки. Тип определяется по заголовкам колонок.
	 *
	 * @param files Файлы
	 */
	async function loadCsvFiles(files: File[]) {
		for (const file of files) {
			try {
				const rows = parseCSV<Record<string, string>>(await file.text());
				const type = detectCsvType(rows);

				if (type) {
					(db[type] as unknown[]) = rows;
					loadedFiles.value++;

					if (!chatById(chatId.value)) {
						chatId.value = db.chats[0]?.chat_id ?? null;
					}

					const c = chatById(chatId.value);

					if (c && !ticketById(ticketId.value)) {
						setActiveTicket(c.client_id);
					}
				}

				csvResults.value.push({fileName: file.name, type, rows: rows.length, error: false});
			} catch {
				csvResults.value.push({fileName: file.name, type: null, rows: 0, error: true});
			}
		}
	}

	// ---------- сообщения ----------
	function pushMessage(sender: string, type: string, text: string, tid = ticketId.value) {
		db.messages.push({message_id: String(++msgSeq), ticket_id: tid ?? '', ts: nowTs(), sender, type, text});
	}

	/** Системное сообщение о выполненном действии в текущем тикете */
	function systemAction(text: string) {
		pushMessage('system', 'action', text);
	}

	function send() {
		const text = draft.value.trim();
		const t    = ticket.value;

		if (!text || !t || 'решено' === t.status) {
			return;
		}

		pushMessage('operator', 'text', text);
		draft.value = '';
	}

	// ---------- закрытие тикета клиентом ----------
	function requestClosure() {
		const t = ticket.value;

		if (!t || 'решено' === t.status) {
			return;
		}

		t.closureReq = true;
		pushMessage('system', 'event', 'Оператор запросил у клиента подтверждение решения');
		toast('Клиенту отправлен запрос: «Проблема решена?»', 'info');
	}

	function clientSaysYes(t: Ticket) {
		t.saidYes = true;
	}

	function clientSaysNo(t: Ticket) {
		t.closureReq = false;
		t.saidYes    = false;
		pushMessage('client', 'text', 'Нет, проблема пока не решена', t.ticket_id);
		toast('⚡ AI: клиент не подтвердил решение — тикет остаётся открытым, предложена эскалация старшему смены', 'info');
	}

	function closeTicket(t: Ticket, stars: number) {
		t.status = 'решено';
		t.csat   = String(stars);

		const operatorMessages = messagesOf(t.ticket_id).filter((m) => 'operator' === m.sender).length;

		t.fcr        = 2 >= operatorMessages ? '1' : '0';
		t.closureReq = false;
		t.saidYes    = false;
		pushMessage('system', 'action', `✅ Клиент подтвердил решение и поставил оценку ${stars}/5. Тикет ${t.ticket_id} закрыт.`, t.ticket_id);
		toast(`Тикет закрыт клиентом · CSAT ${stars}/5${'1' === t.fcr ? ' · FCR' : ''}`, 'ok');
	}

	// ---------- действия в один клик ----------
	function runAction(id: string) {
		const cl = client.value;

		switch (id) {
			case 'return':
			case 'exchange':
			case 'warranty':
			case 'transfer':
			case 'service':
				actionType.value = id;
				break;
			case 'merch':
				toast('Запрос отправлен мерчендайзеру: возможный брак партии LG F2J5HS6W', 'info');
				break;
			case 'catalog':
				toast('Каталог JBL открыт: 6 моделей в наличии в Благовещенске', 'info');
				break;
			case 'tpl':
				draft.value = intent.value?.replies.biz ?? '';
				break;
			case 'call':
				toast(`Набираем клиента: ${cl?.phone ?? ''}`, 'info');
				break;
			case 'resend':
				systemAction(`✅ Код выдачи отправлен повторно на номер ${cl?.phone}. Курьер предупреждён и ждёт.`);
				break;
			case 'wms':
				systemAction('✅ Запрос в WMS выполнен: остаток заказа прибудет в пункт выдачи завтра до 14:00. Клиент получит пуш.');
				break;
			case 'credit':
				systemAction('✅ Банк подтвердил кредит. Заказ переведён в статус «в сборке», клиенту отправлено уведомление.');
				break;
			case 'reg':
				toast('Регламент гарантийного обслуживания открыт в базе знаний', 'info');
				break;
			case 'locker':
				systemAction('✅ Ячейка 14 постамата «Гоголя 41» открыта удалённо.');
				break;
			case 'lockerop':
				toast('Оператор постаматной сети уведомлён о сбое ячейки', 'info');
				break;
		}
	}

	/** Подтверждение модального окна возврата / обмена / гарантии */
	function confirmAction(form: ActionForm) {
		const type = actionType.value;
		const c    = chat.value;

		actionType.value = null;

		if (!type || !c) {
			return;
		}

		if ('return' === type) {
			const order: Order | undefined = db.orders.find((o) => o.order_id === form.orderId) ?? ordersOf(c.client_id)[0];

			if (order) {
				order.status = 'возврат оформлен';
			}

			systemAction(`✅ Возврат RMA-10${c.chat_id.slice(-4)} оформлен по заказу ${order?.order_id ?? form.orderId}. Курьер заберёт технику ${form.time.toLowerCase()}. Деньги вернутся в течение 5 дней после приёмки.`);
			toast(`Возврат оформлен. Клиент ${firstName(client.value?.name)} видит статус у себя в приложении`, 'ok');
		} else if ('transfer' === type) {
			systemAction(`🔀 Чат переведён: ${form.way}. Приоритет: ${form.time.toLowerCase()}. История переписки передана.`);
			toast(`Чат переведён: ${form.way}`, 'ok');
		} else if ('service' === type) {
			systemAction(`🛠 Заявка в СЦ SC-${c.chat_id.slice(-5)} создана: ${form.time.toLowerCase()}, ${form.way}. Клиенту отправлены номер заявки и адрес.`);
			toast('Заявка в сервисный центр создана', 'ok');
		} else if ('exchange' === type) {
			systemAction(`✅ Обмен оформлен: ${form.swap}. Клиенту отправлена инструкция и адрес магазина.`);
			toast('Обмен оформлен без заявления и экспертизы', 'ok');
		} else {
			systemAction(`✅ Заявка на гарантийный ремонт создана: ${form.way}. Диагностика до 3 дней.`);
			toast('Гарантийная заявка создана', 'ok');
		}
	}

	loadDemo();

	return {
		db, chatId, ticketId, expanded, filter, draft, toasts, actionType, client360Id, isCsvOpen, csvResults, loadedFiles,
		chat, client, ticket, isClosed, intent, queue,
		clientById, chatById, ticketById, clientOfChat, messagesOf, ordersOf, ticketsOf, ordersSorted, ticketsSorted, lastMessage,
		toast, dismissToast, selectChat, selectSub, toggleExpanded, setActiveTicket,
		loadDemo, restoreDemo, loadCsvFiles,
		send, requestClosure, clientSaysYes, clientSaysNo, closeTicket, runAction, confirmAction,
	};
});
