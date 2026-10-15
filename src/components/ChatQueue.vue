<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {CounterBadge} from '@dns-modules/badge';
import {BaseUiIconButton, SIZE, VARIANT} from '@dns-modules/base-ui-button';
import {SIZES, Tab, TabList} from '@dns-modules/base-ui-tabs';
import {IconActionClose, IconActionSearch} from '@dns-modules/font-icon-v3';
import {AutoSearchInput, COLORS as SEARCH_COLORS, SIZES as SEARCH_SIZES} from '@dns-modules/search-input';
import {useCrmStore} from '../stores/crm';
import type {ChatFilter} from '../types';
import {nowTs, shortTime} from '../utils/format';
import {ticketWait, waitLabel} from '../utils/wait';
import ChatMenu from './chat-menu/ChatMenu.vue';
import ChatMenuItem from './chat-menu/ChatMenuItem.vue';
import ClientTickets from './ClientTickets.vue';
import IconSidebar from './icons/IconSidebar.vue';
import MiniTicketsPopover from './MiniTicketsPopover.vue';
import UserAvatar from './UserAvatar.vue';

import '@dns-modules/badge/style.css';
import '@dns-modules/base-ui-button/style.css';
import '@dns-modules/base-ui-tabs/style.css';
import '@dns-modules/search-input/style.css';

/**
 * Очередь чатов в два шага, как топики в Telegram:
 * сначала список людей; клик по человеку сворачивает список в ленту аватаров и открывает рядом панель с его тикетами.
 * Диалог открывается кликом по тикету.
 */

const store = useCrmStore();

const TABS: {id: ChatFilter; title: string}[] = [
	{id: 'active', title: 'Активные'},
	{id: 'waiting', title: 'Новые'},
	{id: 'all', title: 'Архив'},
];

/** Чат, у которого открыта панель с тикетами */
const panelChat    = computed(() => store.chatById(store.panelChatId));
const panelClient  = computed(() => (panelChat.value ? store.clientOfChat(panelChat.value) : undefined));

/** Переключение вкладки: список людей меняется, поэтому панель с тикетами закрываем */
function selectFilter(id: ChatFilter) {
	store.filter = id;
	store.closePanel();
}

/** Поиск из свёрнутой колонки: разворачиваем колонку и ставим фокус в поле поиска */
async function openSearch() {
	if (store.isQueueCollapsed) {
		store.toggleQueue();
	}

	await nextTick();
	document.querySelector<HTMLInputElement>('.queue__search input')?.focus();
}

/** Пустой список людей: при поиске называем запрос, иначе общая фраза про фильтр */
const emptyText = computed(() => {
	const query = store.search.trim();

	return query ? `По вашему запросу «${query}» чатов не найдено` : 'Нет чатов по фильтру';
});

/** Количество чатов в фильтре */
function countByFilter(id: ChatFilter) {
	return store.db.chats.filter((c) => ('all' === id ? !activeTickets(c.client_id) : !!activeTickets(c.client_id) && c.status === id)).length;
}

/** Число активных (не решённых) тикетов клиента */
function activeTickets(clientId: string) {
	return store.ticketsOf(clientId).filter((t) => 'решено' !== t.status).length;
}

/** Наивысший приоритет среди активных тикетов клиента: высокий важнее среднего, средний — низкого */
function topPriority(clientId: string) {
	const open = store.ticketsOf(clientId).filter((t) => 'решено' !== t.status);

	if (open.some((t) => 'high' === t.priority)) {
		return 'high';
	}

	if (open.some((t) => 'medium' === t.priority)) {
		return 'medium';
	}

	return open.some((t) => 'low' === t.priority) ? 'low' : '';
}

/** Подсказка приоритета человека: сколько дольше всех ждёт ответа его обращение; если ждущих нет — оператор уже ответил */
function waitText(clientId: string) {
	const waits = store.ticketsOf(clientId)
		.filter((t) => 'решено' !== t.status)
		.map((t) => ticketWait(store.messagesOf(t.ticket_id), nowTs()))
		.filter((w) => w.isWaiting);

	if (!waits.length) {
		return waitLabel({level: 'new', hours: 0, isWaiting: false});
	}

	return waitLabel(waits.reduce((worst, w) => (w.hours > worst.hours ? w : worst)));
}

// ---------- свёрнутая колонка: меню с тикетами у аватара ----------
/** Сколько курсор должен задержаться на аватаре, чтобы открылось меню */
const HOVER_OPEN_MS   = 450;
/** Когда меню уже открыто, на другой аватар переключаемся быстрее */
const HOVER_SWITCH_MS = 120;
/** Запас, чтобы меню не закрывалось, пока курсор идёт от аватара к нему */
const HOVER_CLOSE_MS  = 220;

const miniChatId = ref<string | null>(null);
/** Открыто кликом: не закрывается уходом курсора, только кликом снаружи, Esc или выбором тикета */
const miniPinned = ref(false);
const miniPos    = ref({top: 0, left: 0});

let openTimer: ReturnType<typeof setTimeout> | undefined;
let closeTimer: ReturnType<typeof setTimeout> | undefined;
let miniOpener: HTMLElement | null = null;

function clearTimers() {
	clearTimeout(openTimer);
	clearTimeout(closeTimer);
}

function showMini(chatId: string, el: HTMLElement, pinned: boolean) {
	const rect = el.getBoundingClientRect();

	miniOpener       = el;
	miniPos.value    = {top: rect.top, left: rect.right + 4};
	miniChatId.value = chatId;

	if (pinned) {
		miniPinned.value = true;
	}
}

function closeMini(restoreFocus = false) {
	clearTimers();
	miniChatId.value = null;
	miniPinned.value = false;

	if (restoreFocus) {
		miniOpener?.focus();
	}
}

/** Долгое наведение на аватар */
function onMiniEnter(chatId: string, e: MouseEvent) {
	const el = e.currentTarget as HTMLElement;

	clearTimers();

	if (miniChatId.value === chatId) {
		return;
	}

	openTimer = setTimeout(() => showMini(chatId, el, false), miniChatId.value ? HOVER_SWITCH_MS : HOVER_OPEN_MS);
}

/** Курсор ушёл с аватара или из меню: закрепление держит меню открытым */
function onMiniLeave() {
	clearTimeout(openTimer);

	if (!miniPinned.value) {
		closeTimer = setTimeout(() => closeMini(), HOVER_CLOSE_MS);
	}
}

function onPopoverHover(on: boolean) {
	if (on) {
		clearTimeout(closeTimer);
	} else {
		onMiniLeave();
	}
}

/** Клик по аватару открывает меню и закрепляет его; повторный клик закрывает */
function onMiniClick(chatId: string, e: MouseEvent) {
	clearTimers();

	if (miniChatId.value === chatId && miniPinned.value) {
		closeMini();

		return;
	}

	showMini(chatId, e.currentTarget as HTMLElement, true);
	nextTick(() => document.querySelector<HTMLElement>('.mini-pop button')?.focus());
}

function onDocPointerDown(e: PointerEvent) {
	if (miniChatId.value && !(e.target as HTMLElement).closest('.mini-pop, .mini__item')) {
		closeMini();
	}
}

function onDocKeydown(e: KeyboardEvent) {
	if ('Escape' === e.key && miniChatId.value) {
		closeMini(true);
	}
}

onMounted(() => {
	document.addEventListener('pointerdown', onDocPointerDown);
	document.addEventListener('keydown', onDocKeydown);
});

onBeforeUnmount(() => {
	clearTimers();
	document.removeEventListener('pointerdown', onDocPointerDown);
	document.removeEventListener('keydown', onDocKeydown);
});

// Колонку развернули — меню у аватара больше не нужно
watch(() => store.isQueueCollapsed, () => closeMini());
</script>

<template>
	<aside class="queue" :class="{'queue--collapsed': store.isQueueCollapsed}" @keydown.esc="store.closePanel()">
		<!-- Оба вида всегда в DOM и плавно перетекают друг в друга, пока меняется ширина колонки -->
		<!-- Свёрнутая колонка: только столбец людей -->
		<div class="mini" :aria-hidden="!store.isQueueCollapsed" :inert="store.isQueueCollapsed ? undefined : true">
			<base-ui-icon-button
				:variant="VARIANT.secondary"
				:size="SIZE.tiny"
				title="Развернуть список"
				aria-label="Развернуть список чатов"
				@click="store.toggleQueue()"
			>
				<icon-sidebar />
			</base-ui-icon-button>

			<!-- Поиск в свёрнутой колонке: кнопка разворачивает колонку и ставит фокус в поле поиска -->
			<base-ui-icon-button
				:variant="VARIANT.secondary"
				:size="SIZE.tiny"
				title="Поиск"
				aria-label="Поиск по людям и тикетам"
				@click="openSearch"
			>
				<icon-action-search />
			</base-ui-icon-button>

			<nav class="mini__list" aria-label="Чаты" @scroll="closeMini()">
				<button
					v-for="chat in store.queue"
					:key="chat.chat_id"
					type="button"
					class="mini__item"
					:class="{'mini__item--on': chat.chat_id === store.chatId, 'mini__item--open': chat.chat_id === miniChatId, 'mini__item--panel': chat.chat_id === store.panelChatId}"
					:aria-label="store.clientOfChat(chat)?.name"
					aria-haspopup="dialog"
					:aria-expanded="chat.chat_id === miniChatId"
					:aria-current="chat.chat_id === store.chatId ? 'true' : undefined"
					@click="onMiniClick(chat.chat_id, $event)"
					@mouseenter="onMiniEnter(chat.chat_id, $event)"
					@mouseleave="onMiniLeave"
				>
					<user-avatar :name="store.clientOfChat(chat)?.name" :size="40" :online="'1' === chat.online" />
					<counter-badge v-if="activeTickets(chat.client_id)" class="mini__badge" color="gray">{{ activeTickets(chat.client_id) }}</counter-badge>
				</button>
			</nav>
		</div>

		<!-- Ширина содержимого фиксирована: при разворачивании колонка раскрывается над ним, и шапка не перестраивается -->
		<div class="queue__full" :aria-hidden="store.isQueueCollapsed" :inert="store.isQueueCollapsed ? true : undefined">
		<!-- Шапка колонки не меняется при открытии панели тикетов -->
		<div class="queue__head">
			<h2 class="queue__title">Мои чаты</h2>
			<base-ui-icon-button
				:variant="VARIANT.secondary"
				:size="SIZE.tiny"
				title="Свернуть до списка людей"
				aria-label="Свернуть список чатов"
				@click="store.toggleQueue()"
			>
				<icon-sidebar />
			</base-ui-icon-button>
		</div>

		<div class="queue__search">
			<auto-search-input
				v-model="store.search"
				:size="SEARCH_SIZES.small"
				:color="SEARCH_COLORS.grey"
				label=""
				placeholder="Поиск по людям и тикетам"
			/>
		</div>

		<tab-list class="queue__tabs" :tabs="TABS">
			<template #default="{id, title}">
				<tab
					:is-active="store.filter === id"
					:size="SIZES.small"
					@click="selectFilter(id as ChatFilter)"
				>
					{{ title }}
					<counter-badge class="queue__tab-count" color="gray" shape="rectangle">
						{{ countByFilter(id as ChatFilter) }}
					</counter-badge>
				</tab>
			</template>
		</tab-list>

		<!-- Список людей всегда такой же; панель с тикетами выезжает поверх имён и оставляет видимыми только аватары -->
		<div class="queue__body">
			<div class="queue__list">
				<div v-if="!store.queue.length" class="queue__empty">{{ emptyText }}</div>

				<chat-menu v-else label="Чаты">
					<chat-menu-item
						v-for="chat in store.queue"
						:key="chat.chat_id"
						:name="store.clientOfChat(chat)?.name ?? ''"
						:preview="store.clientOfChat(chat)?.phone ?? ''"
						:time="shortTime(store.lastMessage(chat.client_id)?.ts)"
						:priority="topPriority(chat.client_id)"
						:wait-text="waitText(chat.client_id)"
						:badge="activeTickets(chat.client_id)"
						:online="'1' === chat.online"
						:is-selected="chat.chat_id === store.chatId"
						:is-active="chat.chat_id === store.panelChatId"
						@click="store.openPanel(chat.chat_id)"
					/>
				</chat-menu>
			</div>

			<!-- key по чату: при выборе другого человека панель уезжает и выезжает заново с новым наполнением -->
			<transition name="slide" mode="out-in">
				<section v-if="panelChat" :key="panelChat.chat_id" class="panel" aria-label="Обращения клиента">
					<header class="panel__head">
						<base-ui-icon-button
							:variant="VARIANT.secondary"
							:size="SIZE.tiny"
							title="Закрыть"
							aria-label="Закрыть панель обращений"
							@click="store.closePanel()"
						>
							<icon-action-close />
						</base-ui-icon-button>
						<div class="panel__name">{{ panelClient?.name }}</div>
					</header>

					<div class="panel__list">
						<client-tickets :chat-id="panelChat.chat_id" />
					</div>
				</section>
			</transition>
		</div>
		</div>

		<mini-tickets-popover
			:chat-id="miniChatId"
			:top="miniPos.top"
			:left="miniPos.left"
			@select="closeMini()"
			@hover="onPopoverHover"
		/>
	</aside>
</template>

<style scoped lang="scss">
// Ширина развёрнутой панели: три таба с счётчиками (до двух цифр) и отступами помещаются в одну строку
$queue-width: 360px;

.queue {
	display:        flex;
	flex:           none;
	flex-direction: column;
	width:          $queue-width;
	min-height:     0;
	background:     var(--crm-panel);
	position:       relative;
	border-right:   1px solid var(--crm-line);
	overflow:       hidden;
	transition:     width 0.22s ease;

	// Свёрнутая колонка — только столбец людей; развёрнутый вид гаснет, свёрнутый проявляется
	&--collapsed {
		width: 72px;

		.queue__full {
			opacity:        0;
			pointer-events: none;
		}

		.mini {
			opacity:        1;
			pointer-events: auto;
		}
	}

	// Развёрнутое содержимое всегда полной ширины, даже пока колонка ещё растёт
	&__full {
		display:        flex;
		flex:           none;
		flex-direction: column;
		width:          $queue-width;
		height:         100%;
		min-height:     0;
		transition:     opacity 0.22s ease;
	}

	&__head {
		display:         flex;
		align-items:     center;
		justify-content: space-between;
		padding:         20px 16px 12px;
	}

	&__search {
		padding: 0 16px 12px;
	}

	&__title {
		margin:      0;
		font-size:   20px;
		font-weight: 700;
		line-height: 26px;
	}

	&__tabs {
		gap:           8px;
		padding:       0 16px 16px;
		border-bottom: 1px solid var(--stroke-border-light, #eee);
	}

	// Табы не сжимаем: при дробном масштабе экрана компонент иначе обрезает текст вместе с бейджем
	&__tabs :deep(button) {
		flex-shrink: 0;
	}

	// Белое кольцо бейджа делаем прозрачным: фон рисуется под рамкой, поэтому размер и форма не меняются
	&__tab-count {
		margin-left:  4px;
		border-color: transparent;
	}

	// Область под шапкой: в ней происходит переход между списком людей и панелью тикетов
	&__body {
		position:       relative;
		display:        flex;
		flex:           1;
		flex-direction: column;
		min-height:     0;
		overflow:       hidden;
	}

	// Вертикальные отступы равны боковым полям плашек строк (8px)
	&__list {
		flex:       1;
		padding:    8px 0;
		overflow-y: auto;
	}


	&__empty {
		padding:    30px 16px;
		text-align: center;
		color:      var(--crm-ink3);
	}
}

// Свёрнутая колонка: те же строки, что в развёрнутом списке, но только с аватарами
.mini {
	position:       absolute;
	top:            0;
	bottom:         0;
	left:           0;
	z-index:        1;
	display:        flex;
	flex-direction: column;
	gap:            12px;
	align-items:    center;
	width:          72px;
	min-height:     0;
	padding:        20px 0 0;
	opacity:        0;
	pointer-events: none;
	transition:     opacity 0.22s ease;

	&__list {
		display:        flex;
		flex:           1;
		flex-direction: column;
		gap:            4px;
		align-self:     stretch;
		min-height:     0;
		overflow-y:     auto;
	}

	// Выбранное состояние как в развёрнутом списке: оранжевая полоса слева у чата, открытого в диалоге
	&__item {
		position:        relative;
		display:         flex;
		flex:            none;
		align-items:     center;
		justify-content: center;
		// Поля по бокам: фон — скруглённая плашка, полоса выбора уходит в левое поле
		width:           calc(100% - 16px);
		height:          64px;
		padding:         0;
		margin:          0 8px;
		cursor:          pointer;
		background:      transparent;
		border:          none;
		border-radius:   12px;
		transition:      background-color 0.2s;

		// Полоса выбора: ниже строки и со скруглением
		&::before {
			position:      absolute;
			top:           16px;
			bottom:        16px;
			left:          4px;
			width:         3px;
			content:       '';
			background:    var(--stroke-border-brand, #fc8507);
			border-radius: 3px;
			opacity:       0;
			transition:    opacity 0.2s;
		}

		&:focus-visible {
			outline:        1px solid var(--stroke-border-dark, #434242);
			outline-offset: -1px;
		}

		// Наведение, открытое меню тикетов и открытая панель тикетов — серый фон; чат в диалоге отмечен только полосой
		&:hover,
		&--open,
		&--panel {
			background-color: var(--background-primary, #f7f7f7);
		}

		&--on::before {
			opacity: 1;
		}
	}

	// Счётчик в правом верхнем углу аватара: правый нижний занят индикатором «онлайн»
	&__badge {
		position: absolute;
		top:      6px;
		right:    11px;
	}
}

.panel {
	// Выезжает поверх имён: слева остаются только аватары, а имя закрыто целиком (имя начинается с 72px).
	// Край панели на 12px правее аватара — столько же, сколько между аватаром и левым краем плашки
	position:       absolute;
	top:            0;
	right:          0;
	bottom:         0;
	left:           72px;
	z-index:        2;
	display:        flex;
	flex-direction: column;
	min-width:      0;
	background:     var(--crm-panel);
	border-left:    1px solid var(--stroke-border-light, #eee);

	&__head {
		display:       flex;
		gap:           8px;
		align-items:   center;
		padding:       14px 12px;
		border-bottom: 1px solid var(--stroke-border-light, #eee);
	}

	&__name {
		overflow:      hidden;
		font-size:     16px;
		font-weight:   700;
		line-height:   24px;
		text-overflow: ellipsis;
		white-space:   nowrap;
	}

	&__list {
		flex:       1;
		padding:    8px;
		overflow-y: auto;
	}
}

// Панель тикетов выезжает справа поверх списка
.slide-enter-active,
.slide-leave-active {
	transition: transform 0.22s ease, opacity 0.22s ease;
}

.slide-enter-from,
.slide-leave-to {
	opacity:   0;
	transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
	.slide-enter-active,
	.slide-leave-active,
	.queue,
	.queue__full,
	.mini {
		transition: none;
	}
}
</style>
