import {acceptHMRUpdate, defineStore} from 'pinia';
import {computed, reactive, ref} from 'vue';
import {DEMO_CSV, DEMO_PREVIEWS} from '../data/demo';
import type {ActionType, Chat, ChatFilter, Client, CsvType, Db, Intent, Message, Order, OutgoingFile, Ticket, TicketSource, ToastItem} from '../types';
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

/** Допустимые приоритеты тикета */
const PRIORITIES = ['high', 'medium', 'low'];

/** Текущий оператор: имя из шапки; приватные заметки хранятся под его именем и другим операторам не видны */
export const CURRENT_OPERATOR = 'Анна К.';

/** Хранилище CRM: данные выгрузки, выбранный чат/тикет и все действия оператора */
export const useCrmStore = defineStore('crm', () => {
	const db = reactive<Db>({clients: [], orders: [], tickets: [], chats: [], messages: []});

	const chatId       = ref<string | null>(null);
	const ticketId     = ref<string | null>(null);
	const filter       = ref<ChatFilter>('active');
	/** Строка поиска по людям и тикетам */
	const search       = ref('');
	/** Фильтр списка тикетов по каналу: всегда выбран один из двух — чат на сайте или форма обратной связи */
	const ticketSource = ref<TicketSource>('chat');
	/** Левая колонка свёрнута до столбца аватаров */
	const isQueueCollapsed = ref(false);
	/** Чат, у которого открыта панель с тикетами (как топики в Telegram); не зависит от того, какой чат открыт в диалоге */
	const panelChatId   = ref<string | null>(null);
	const draft        = ref('');
	/** Правая панель с деталями обращения: по умолчанию закрыта, открывается стрелкой у края шапки чата */
	const isDetailsOpen = ref(false);
	/** Открыто окно с заметкой к текущему тикету */
	const isNoteOpen    = ref(false);
	const isTopicOpen   = ref(false);
	/** Приватные заметки оператора к тикетам: ключ «оператор|тикет», одна заметка на тикет, клиенту не уходят */
	const notes        = reactive<Record<string, string>>({});
	/** Кто и когда последним правил заметку: «дд.мм.гггг чч:мм» */
	const noteMeta     = reactive<Record<string, {editor: string; ts: string}>>({});
	const toasts      = ref<ToastItem[]>([]);
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

	/** Активный заказ: привязанный к открытому обращению, иначе проблемный, иначе самый свежий */
	const activeOrder = computed<Order | undefined>(() => {
		if (!chat.value) {
			return undefined;
		}

		const all = ordersSorted(chat.value.client_id);

		return all.find((o) => o.order_id === ticket.value?.order_id)
			?? all.find((o) => 'проблема' === o.status)
			?? all[0];
	});

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
	/** Подходит ли тикет под поисковый запрос: тема, номер тикета, номер заказа, текст сообщений */
	function ticketMatches(t: Ticket, q: string) {
		return t.topic.toLowerCase().includes(q)
			|| t.ticket_id.includes(q)
			|| t.order_id.toLowerCase().includes(q)
			|| messagesOf(t.ticket_id).some((m) => m.text.toLowerCase().includes(q));
	}

	/** Подходит ли сам человек под запрос: имя, ID, телефон, почта */
	function clientMatches(cl: Client | undefined, q: string) {
		return !!cl && (cl.name.toLowerCase().includes(q) || cl.client_id.includes(q) || cl.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) || cl.email.toLowerCase().includes(q));
	}

	const searchQuery = computed(() => search.value.trim().toLowerCase());

	/** Канал тикета: всё, что не пришло с формы, считаем чатом (в старых выгрузках колонки нет) */
	const sourceOf = (t: Ticket): TicketSource => ('form' === t.source ? 'form' : 'chat');

	/** Тикеты клиента для панели: при поиске по тикетам — только подходящие, если сам человек под запрос не подходит */
	function ticketsForPanel(cid: string) {
		const all = ticketsSorted(cid);
		const q   = searchQuery.value;

		if (!q || clientMatches(clientById(cid), q)) {
			return all;
		}

		const found = all.filter((t) => ticketMatches(t, q));

		return found.length ? found : all;
	}

	const queue = computed(() => {
		let chats = db.chats.slice();

		// «Архив» — люди, у которых все тикеты закрыты; «Активные» и «Новые» — только люди с открытыми тикетами
		chats = chats.filter((c) => {
			const hasOpen = ticketsOf(c.client_id).some((t) => 'решено' !== t.status);

			return 'all' === filter.value ? !hasOpen : hasOpen && c.status === filter.value;
		});

		const q = searchQuery.value;

		if (q) {
			chats = chats.filter((c) => clientMatches(clientOfChat(c), q) || ticketsOf(c.client_id).some((t) => ticketMatches(t, q)));
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
		chatId.value = id;

		const c = chatById(id);

		if (c) {
			c.unread = '0';
			setActiveTicket(c.client_id);
		}
	}

	/** Свернуть открытый чат: диалог закрывается, остаётся заглушка «Чат не выбран» */
	function closeChat() {
		chatId.value    = null;
		ticketId.value  = null;
		isDetailsOpen.value = false;
	}

	/** Клик по клиенту в списке: открывает панель с его тикетами, диалог не меняется */
	function openPanel(id: string) {
		panelChatId.value = id;
	}

	function closePanel() {
		panelChatId.value = null;
	}

	/** Свернуть левую колонку до столбца аватаров или развернуть обратно */
	function toggleQueue() {
		isQueueCollapsed.value = !isQueueCollapsed.value;
		panelChatId.value      = null;
	}

	/** Клик по тикету: открывает диалог по этому тикету */
	function selectSub(cid: string, tid: string) {
		chatId.value   = cid;
		ticketId.value = tid;

		const c = chatById(cid);

		if (c) {
			c.unread = '0';
		}
	}

	// ---------- данные ----------
	/** У каждого тикета есть приоритет: если в выгрузке он не указан или неизвестен, это низкий */
	function normalizePriorities() {
		for (const t of db.tickets) {
			if (!PRIORITIES.includes(t.priority ?? '')) {
				t.priority = 'low';
			}
		}
	}

	function loadDemo() {
		for (const table of TABLES) {
			(db[table] as unknown[]) = parseCSV(DEMO_CSV[table] ?? '');
		}
		normalizePriorities();

		for (const m of db.messages) {
			m.preview = DEMO_PREVIEWS[m.message_id];
		}

		resetSelection();
	}

	function resetSelection() {
		// Чат не выбран: оператор видит заглушку «Выберите чат», пока сам не откроет диалог
		chatId.value      = null;
		ticketId.value    = null;
		panelChatId.value = null;
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
					normalizePriorities();
					loadedFiles.value++;

					// Выбранный чат пропал из новой выгрузки — возвращаемся к заглушке
					const c = chatById(chatId.value);

					if (!c) {
						chatId.value   = null;
						ticketId.value = null;
					} else if (!ticketById(ticketId.value)) {
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
	function pushMessage(sender: string, type: string, text: string, tid = ticketId.value, extra: Pick<Message, 'preview' | 'batch'> = {}) {
		db.messages.push({message_id: String(++msgSeq), ticket_id: tid ?? '', ts: nowTs(), sender, type, text, ...extra});
	}

	/** Системное сообщение о выполненном действии в текущем тикете */
	function systemAction(text: string) {
		pushMessage('system', 'action', text);
	}

	/**
	 * Отправка сообщения оператора: сначала вложения, затем текст
	 *
	 * @param files Прикреплённые файлы: имя и превью изображения
	 */
	function send(files: OutgoingFile[] = []) {
		const text = draft.value.trim();
		const t    = ticket.value;

		if ((!text && !files.length) || !t || 'решено' === t.status) {
			return;
		}

		// Файлы одной отправки получают общий id, чтобы в ленте они шли одной группой, а отдельные отправки не сливались
		const batch = `b${++msgSeq}`;

		for (const file of files) {
			pushMessage('operator', 'attachment', file.name, t.ticket_id, {preview: file.previewUrl, batch});
		}

		if (text) {
			pushMessage('operator', 'text', text);
		}

		draft.value = '';
	}

	// ---------- приватные заметки ----------
	const noteKey = (tid: string) => `${CURRENT_OPERATOR}|${tid}`;

	/** Заметка текущего оператора к тикету; чужие заметки сюда не попадают по ключу */
	const noteOf = (tid: string | null) => (tid ? notes[noteKey(tid)] ?? '' : '');

	/** Последний редактор заметки и время правки; пусто, пока заметки нет */
	const noteMetaOf = (tid: string | null) => (tid ? noteMeta[noteKey(tid)] : undefined);

	/** Сохраняет заметку и запоминает, кто и когда её правил; пустая заметка удаляется, и тег в ленте снова серый */
	function setNote(tid: string | null, text: string) {
		if (!tid) {
			return;
		}

		const value = text.trim();

		if (value) {
			notes[noteKey(tid)]    = value;
			noteMeta[noteKey(tid)] = {editor: CURRENT_OPERATOR, ts: nowTs()};
		} else {
			delete notes[noteKey(tid)];
			delete noteMeta[noteKey(tid)];
		}
	}

	// ---------- тема обращения ----------
	/** Меняет тему обращения на одну из категорий сайта */
	function setTopic(tid: string | null, topic: string) {
		const t = ticketById(tid);

		if (!t || 'решено' === t.status || t.site_topic === topic) {
			return;
		}

		t.site_topic = topic;
		toast(`Тема обращения изменена: «${topic}»`, 'ok');
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
			case 'reschedule':
			case 'cancel':
			case 'receipt':
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
		} else if ('reschedule' === type) {
			systemAction(`📅 Доставка заказа ${form.orderId} перенесена: ${form.way}, ${form.time}. Клиент получил уведомление.`);
			toast('Дата доставки изменена', 'ok');
		} else if ('cancel' === type) {
			const order = db.orders.find((o) => o.order_id === form.orderId);

			if (order) {
				order.status = 'отменён';
			}

			systemAction(`🚫 Заказ ${form.orderId} отменён. Причина: ${form.way.toLowerCase()}. Деньги вернутся в течение 5 рабочих дней.`);
			toast(`Заказ ${form.orderId} отменён`, 'ok');
		} else if ('receipt' === type) {
			const cl     = client.value;
			const target = 'SMS' === form.time ? cl?.phone : cl?.email;

			systemAction(`🧾 ${form.way} по заказу ${form.orderId} отправлен по ${form.time}: ${target ?? ''}.`);
			toast(`${form.way} отправлен по ${form.time}`, 'ok');
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
		db, chatId, ticketId, panelChatId, filter, ticketSource, search, isQueueCollapsed, draft, isDetailsOpen, isNoteOpen, isTopicOpen, toasts, actionType, client360Id, isCsvOpen, csvResults, loadedFiles,
		chat, client, ticket, isClosed, activeOrder, intent, queue,
		clientById, chatById, ticketById, clientOfChat, messagesOf, noteOf, noteMetaOf, setNote, setTopic, ordersOf, ticketsOf, ordersSorted, ticketsSorted, lastMessage,
		toast, dismissToast, selectChat, closeChat, selectSub, openPanel, closePanel, toggleQueue, ticketsForPanel, sourceOf, setActiveTicket,
		loadDemo, restoreDemo, loadCsvFiles,
		send, requestClosure, clientSaysYes, clientSaysNo, closeTicket, runAction, confirmAction,
	};
});

// Горячая замена хранилища в dev: без неё компоненты получают новый код, а стор остаётся старым, и сигнатуры методов расходятся
if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useCrmStore, import.meta.hot));
}
