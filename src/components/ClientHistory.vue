<script setup lang="ts">
import {computed, ref} from 'vue';
import {CounterBadge} from '@dns-modules/badge';
import {BaseUiButton, VARIANT} from '@dns-modules/base-ui-button';
import {SIZES, Tab, TabList} from '@dns-modules/base-ui-tabs';
import {Modal, SIZES as MODAL_SIZES} from '@dns-modules/modal';
import {Status} from '@dns-modules/status';
import {useCrmStore} from '../stores/crm';
import type {Order, Ticket} from '../types';
import {shortTopic, timePart} from '../utils/format';
import {orderTracking, shortDate} from '../utils/order';
import OrderCard from './OrderCard.vue';
import OrderStatus from './OrderStatus.vue';

import '@dns-modules/badge/style.css';
import '@dns-modules/base-ui-button/style.css';
import '@dns-modules/modal/style.css';
import '@dns-modules/base-ui-tabs/style.css';
import '@dns-modules/status/style.css';

/**
 * История клиента: заказы, обращения и сервисные обращения во вкладках
 */

type TabId = 'orders' | 'tickets' | 'service';

const store = useCrmStore();

const activeTab    = ref<TabId>('orders');
const openedOrder  = ref<Order | null>(null);
const openedTicket = ref<Ticket | null>(null);

const cid = computed(() => store.chat?.client_id ?? '');

const orders  = computed(() => store.ordersSorted(cid.value));
const tickets = computed(() => store.ticketsSorted(cid.value));

/** Сервисные обращения: гарантия и ремонт, возврат и обмен */
const SERVICE_CATEGORIES: Record<string, string> = {
	'гарантия': 'Гарантия / ремонт',
	'возврат':  'Возврат / обмен',
};

const service = computed(() => tickets.value.filter((t) => t.category in SERVICE_CATEGORIES));

const tabs = computed(() => [
	{id: 'orders', title: 'Заказы', count: orders.value.length},
	{id: 'tickets', title: 'Обращения', count: tickets.value.length},
	{id: 'service', title: 'Сервис', count: service.value.length},
]);

/** Переход к тикету в чате клиента */
function goToChat(t: Ticket) {
	openedTicket.value = null;

	if (store.chat) {
		store.selectSub(store.chat.chat_id, t.ticket_id);
	}
}

const CATEGORY_LABELS: Record<string, string> = {
	...SERVICE_CATEGORIES,
	'доставка': 'Доставка',
	'оплата':   'Оплата',
};

const categoryLabel = (t: Ticket) => CATEGORY_LABELS[t.category] ?? t.category;

const SENDER_LABELS: Record<string, string> = {client: 'Клиент', operator: 'Оператор', system: 'Система'};

/** Последние сообщения открытого обращения */
const ticketMessages = computed(() => (openedTicket.value ? store.messagesOf(openedTicket.value.ticket_id).slice(-3) : []));

const isClosed = (t: Ticket) => 'решено' === t.status;
</script>

<template>
	<section class="history">
		<h3 class="history__title">История</h3>

		<tab-list class="history__tabs" :tabs="tabs">
			<template #default="{id, title, count}">
				<tab :size="SIZES.small" :is-active="activeTab === id" @click="activeTab = id as TabId">
					{{ title }}
					<counter-badge class="history__count" color="gray" shape="rectangle">{{ count }}</counter-badge>
				</tab>
			</template>
		</tab-list>

		<!-- История заказов -->
		<ul v-if="'orders' === activeTab" class="list">
			<li v-for="o in orders" :key="o.order_id" class="item">
				<button type="button" class="item__row" title="Открыть заказ" @click="openedOrder = o">
					<span class="item__main">
						<span class="item__title">{{ o.order_id }}</span>
						<span class="item__sub">от {{ shortDate(o.date) }}</span>
					</span>
					<span class="item__side">
						<order-status :status="orderTracking(o)" />
					</span>
				</button>
			</li>
			<li v-if="!orders.length" class="empty">Заказов нет</li>
		</ul>

		<!-- История обращений -->
		<ul v-else-if="'tickets' === activeTab" class="list">
			<li v-for="t in tickets" :key="t.ticket_id" class="item">
				<button
					type="button"
					class="item__row"
					:class="{'item__row--current': t.ticket_id === store.ticketId}"
					title="Открыть обращение"
					@click="openedTicket = t"
				>
					<span class="item__main">
						<span class="item__title">{{ shortTopic(t.topic) }}</span>
						<span class="item__sub">{{ shortDate(t.date) }} · тикет {{ t.ticket_id }}</span>
					</span>
					<span class="item__side">
						<status :color="isClosed(t) ? 'green' : 'red'">{{ isClosed(t) ? 'Решён' : 'В работе' }}</status>
					</span>
				</button>
			</li>
			<li v-if="!tickets.length" class="empty">Обращений нет</li>
		</ul>

		<!-- Сервисные обращения -->
		<ul v-else class="list">
			<li v-for="t in service" :key="t.ticket_id" class="item">
				<button
					type="button"
					class="item__row"
					:class="{'item__row--current': t.ticket_id === store.ticketId}"
					title="Открыть обращение"
					@click="openedTicket = t"
				>
					<span class="item__main">
						<span class="item__title">{{ SERVICE_CATEGORIES[t.category] }}</span>
						<span class="item__sub">{{ shortTopic(t.topic) }}</span>
						<span class="item__sub">{{ shortDate(t.date) }}<template v-if="t.order_id"> · заказ {{ t.order_id }}</template></span>
					</span>
					<span class="item__side">
						<status :color="isClosed(t) ? 'green' : 'orange'">{{ isClosed(t) ? 'Завершено' : 'В работе' }}</status>
					</span>
				</button>
			</li>
			<li v-if="!service.length" class="empty">Сервисных обращений нет</li>
		</ul>

		<modal v-if="openedOrder" has-cross :size="MODAL_SIZES.sm" @close="openedOrder = null">
			<template #title>Заказ</template>
			<div class="modal-body">
				<order-card class="modal-order" :order="openedOrder" />
			</div>
		</modal>

		<modal v-if="openedTicket" has-cross :size="MODAL_SIZES.sm" @close="openedTicket = null">
			<template #title>{{ shortTopic(openedTicket.topic) }}</template>

			<div class="modal-body ticket">
				<div class="ticket__status">
					<status :color="isClosed(openedTicket) ? 'green' : 'red'">{{ isClosed(openedTicket) ? 'Решён' : 'В работе' }}</status>
				</div>

				<dl class="ticket__data">
					<div><dt>Категория</dt><dd>{{ categoryLabel(openedTicket) }}</dd></div>
					<div><dt>Дата</dt><dd>{{ shortDate(openedTicket.date) }}</dd></div>
					<div><dt>Тикет</dt><dd>{{ openedTicket.ticket_id }}</dd></div>
					<div v-if="openedTicket.order_id"><dt>Заказ</dt><dd>{{ openedTicket.order_id }}</dd></div>
					<div><dt>Оператор</dt><dd>{{ openedTicket.operator }}</dd></div>
					<div v-if="openedTicket.csat"><dt>Оценка</dt><dd>{{ openedTicket.csat }} / 5</dd></div>
				</dl>

				<template v-if="ticketMessages.length">
					<h4 class="ticket__sec">Последние сообщения</h4>
					<ul class="ticket__msgs">
						<li v-for="m in ticketMessages" :key="m.message_id" class="ticket__msg">
							<div class="ticket__msg-head">
								<span>{{ SENDER_LABELS[m.sender] ?? m.sender }}</span>
								<span>{{ timePart(m.ts) }}</span>
							</div>
							<div class="ticket__msg-text">{{ m.text }}</div>
						</li>
					</ul>
				</template>
			</div>

			<template #footer="{close}">
				<div class="ticket__footer">
					<base-ui-button :variant="VARIANT.secondary" @click="close()">Закрыть</base-ui-button>
					<base-ui-button @click="goToChat(openedTicket)">Открыть в чате</base-ui-button>
				</div>
			</template>
		</modal>
	</section>
</template>

<style scoped lang="scss">
.history {
	margin-top: 20px;

	// h3: тот же размер, что у заголовка карточки заказа
	&__title {
		margin:      0 0 12px;
		font-size:   18px;
		font-weight: 700;
		line-height: 1.25;
	}

	&__tabs {
		gap:           8px;
		padding-bottom: 8px;
	}

	// Белое кольцо бейджа делаем прозрачным: фон рисуется под рамкой, размер и форма не меняются
	&__count {
		margin-left:  2px;
		border-color: transparent;
	}

	// Три вкладки с бейджами должны помещаться в узкую колонку
	&__tabs :deep(button) {
		flex-shrink:   0;
		padding-right: 6px;
		padding-left:  6px;
		font-size:     14px;
	}
}

.list {
	padding:    0;
	margin:     0;
	list-style: none;
}

.item {
	// Разделитель — только между записями
	& + & {
		border-top: 1px solid var(--stroke-border-light, #eee);
	}

	&__row {
		display:         flex;
		gap:             10px;
		align-items:     flex-start;
		justify-content: space-between;
		width:           100%;
		padding:         10px 4px;
		font:            inherit;
		color:           var(--crm-ink);
		text-align:      start;
		cursor:          pointer;
		background:      transparent;
		border:          none;
		border-radius:   8px;

		&:hover {
			background: var(--crm-bg);
		}

		&:focus-visible {
			outline:        1px solid var(--stroke-border-dark, #434242);
			outline-offset: -1px;
		}

		&--current {
			background: var(--background-date-range, rgba(255, 247, 218, 0.7));
		}
	}

	&__main {
		display:        flex;
		flex:           1;
		flex-direction: column;
		gap:            2px;
		min-width:      0;
	}

	&__title {
		font-size:   16px;
		font-weight: 700;
		line-height: 1.3;
	}

	&__sub {
		font-size:   14px;
		line-height: 1.3;
		color:       var(--crm-ink3);
	}

	&__side {
		display:        flex;
		flex:           none;
		flex-direction: column;
		gap:            4px;
		align-items:    flex-end;
		font-size:      16px;
	}
}

// В модалке карточка заказа без внешних отступов правой панели
.modal-order {
	margin: 0;
}

// Модалка обращения
.ticket {
	padding-bottom: 0;

	&__status {
		margin-bottom: 12px;
	}

	&__data {
		display:        flex;
		flex-direction: column;
		gap:            4px;
		margin:         0;

		div {
			display:         flex;
			gap:             12px;
			justify-content: space-between;
			min-height:      24px;
		}

		dt {
			flex:  none;
			color: var(--crm-ink3);
		}

		dd {
			margin:     0;
			text-align: right;
		}
	}

	&__sec {
		margin:      20px 0 8px;
		font-size:   16px;
		font-weight: 700;
	}

	&__msgs {
		display:        flex;
		flex-direction: column;
		gap:            8px;
		padding:        0;
		margin:         0;
		list-style:     none;
	}

	&__msg {
		padding:       8px 12px;
		background:    var(--crm-bg);
		border-radius: 12px;
	}

	&__msg-head {
		display:         flex;
		justify-content: space-between;
		font-size:       14px;
		color:           var(--crm-ink3);
	}

	&__msg-text {
		margin-top:  2px;
		line-height: 1.4;
	}

	&__footer {
		display:         flex;
		gap:             10px;
		justify-content: flex-end;
	}
}

.empty {
	padding:    16px 0;
	font-size:  14px;
	color:      var(--crm-ink3);
	text-align: center;
}
</style>
