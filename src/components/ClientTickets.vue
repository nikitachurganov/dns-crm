<script setup lang="ts">
import {computed} from 'vue';
import {BaseFilter, FILTER_TYPES} from '@dns-modules/base-filter';
import {useCrmStore} from '../stores/crm';
import type {TicketSource} from '../types';
import {datePart, nowTs, shortTopic, TODAY} from '../utils/format';
import {ticketWait, waitLabel} from '../utils/wait';
import ChatMenu from './chat-menu/ChatMenu.vue';
import ChatMenuSubItem from './chat-menu/ChatMenuSubItem.vue';

import '@dns-modules/base-filter/style.css';

/**
 * Тикеты одного человека: активные сверху, закрытые ниже.
 * Заголовок «Архив» нужен только когда над закрытыми есть активные: если активных нет, закрытые идут списком без него.
 * Общий для боковой панели развёрнутой колонки и всплывающего меню свёрнутой.
 */

const props = defineProps<{
	/** Чат человека */
	chatId: string;
}>();

const emit = defineEmits<{
	/** Тикет выбран, диалог по нему уже открыт */
	select: [ticketId: string];
}>();

const store = useCrmStore();

const chat    = computed(() => store.chatById(props.chatId));
const tickets = computed(() => (chat.value ? store.ticketsForPanel(chat.value.client_id) : []));

/** Каналы обращения: чат на главной странице сайта и форма обратной связи */
const SOURCES: {id: TicketSource; title: string}[] = [
	{id: 'chat', title: 'Чат'},
	{id: 'form', title: 'Обращения'},
];

const visible = computed(() => tickets.value.filter((t) => store.sourceOf(t) === store.ticketSource));

const openTickets   = computed(() => visible.value.filter((t) => 'решено' !== t.status));
const closedTickets = computed(() => visible.value.filter((t) => 'решено' === t.status));

/** Пустой список: при поиске — что именно не нашлось в выбранном канале, иначе общая фраза про фильтр */
const emptyText = computed(() => {
	const query = store.search.trim();

	if (!query) {
		return 'Нет тикетов по фильтру';
	}

	return `По вашему запросу «${query}» ${'chat' === store.ticketSource ? 'чатов' : 'обращений'} не найдено`;
});

/** Сколько тикетов человека приходится на канал */
function countBySource(id: TicketSource) {
	return tickets.value.filter((t) => store.sourceOf(t) === id).length;
}


/** Подсказка приоритета: сколько тикет висит без ответа */
function waitText(ticketId: string) {
	return waitLabel(ticketWait(store.messagesOf(ticketId), nowTs()));
}

/** Подпись справа у тикета */
function subMeta(date: string) {
	return TODAY === datePart(date) ? 'сегодня' : datePart(date).slice(0, 5);
}

function open(ticketId: string) {
	store.selectSub(props.chatId, ticketId);
	emit('select', ticketId);
}
</script>

<template>
	<div class="tickets">
		<div class="tickets__filter" role="group" aria-label="Канал обращения">
			<base-filter
				v-for="source in SOURCES"
				:key="source.id"
				:type="FILTER_TYPES.discrete"
				:is-selected="store.ticketSource === source.id"
				@click="store.ticketSource = source.id"
			>
				{{ source.title }} {{ countBySource(source.id) }}
			</base-filter>
		</div>

		<div v-if="!openTickets.length && !closedTickets.length" class="tickets__empty">{{ emptyText }}</div>

		<chat-menu v-if="openTickets.length" label="Обращения">
			<chat-menu-sub-item
				v-for="t in openTickets"
				:key="t.ticket_id"
				:title="shortTopic(t.topic)"
				:preview="store.messagesOf(t.ticket_id).slice(-1)[0]?.text"
				:hint="t.topic"
				:priority="t.priority"
				:wait-text="waitText(t.ticket_id)"
				:date="subMeta(t.date)"
				status="open"
				:is-selected="t.ticket_id === store.ticketId"
				@click="open(t.ticket_id)"
			/>
		</chat-menu>

		<template v-if="closedTickets.length">
			<div v-if="openTickets.length" class="tickets__archive">Архив</div>
			<chat-menu label="Архив обращений">
				<chat-menu-sub-item
					v-for="t in closedTickets"
					:key="t.ticket_id"
					:title="shortTopic(t.topic)"
					:preview="store.messagesOf(t.ticket_id).slice(-1)[0]?.text"
					:hint="t.topic"
					:date="subMeta(t.date)"
					status="closed"
					:is-selected="t.ticket_id === store.ticketId"
					@click="open(t.ticket_id)"
				/>
			</chat-menu>
		</template>
	</div>
</template>

<style scoped lang="scss">
.tickets__filter {
	display: flex;
	gap:     8px;
	padding: 8px 12px;
}

.tickets__empty {
	padding:    24px 8px;
	text-align: center;
	color:      var(--text-tertiary, #7d7c7c);
}

// Разделитель активных и архивных тикетов: короткий пунктир слева, подпись, длинный пунктир справа
.tickets__archive {
	display:     flex;
	gap:         8px;
	align-items: center;
	margin:      16px 0 8px;
	font-size:   14px;
	font-weight: 400;
	line-height: 20px;
	color:       var(--text-tertiary, #7d7c7c);

	&::before,
	&::after {
		height:     0;
		content:    '';
		border-top: 1px dashed var(--stroke-border, #d2d1d1);
	}

	&::before {
		flex: 0 0 16px;
	}

	&::after {
		flex: 1;
	}
}
</style>
