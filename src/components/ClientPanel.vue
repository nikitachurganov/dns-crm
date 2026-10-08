<script setup lang="ts">
import {computed} from 'vue';
import {BaseUiButton, SIZE, VARIANT} from '@dns-modules/base-ui-button';
import {useCrmStore} from '../stores/crm';
import {datePart, dateKey, kMoney, money, shortTopic} from '../utils/format';
import OrderStatus from './OrderStatus.vue';
import UserAvatar from './UserAvatar.vue';

import '@dns-modules/base-ui-button/style.css';

/**
 * Правая панель: клиент, заказы, прошлые обращения, контекст, база знаний
 */

const store = useCrmStore();

const orders = computed(() => (store.chat ? store.ordersSorted(store.chat.client_id).slice(0, 3) : []));

const past = computed(() => (store.chat
	? store.ticketsOf(store.chat.client_id)
		.filter((t) => 'решено' === t.status)
		.sort((a, b) => dateKey(b.date).localeCompare(dateKey(a.date)))
		.slice(0, 4)
	: []));

/** «18.04.26» */
function orderDate(date: string) {
	const d = datePart(date);

	return `${d.slice(0, 5)}.${d.slice(8)}`;
}
</script>

<template>
	<aside class="client">
		<div v-if="store.client" class="client__inner">
			<div class="client__top">
				<user-avatar :name="store.client.name" :size="44" />
				<div>
					<div class="client__name">{{ store.client.name }}</div>
					<div class="client__id">ID {{ store.client.client_id }} · {{ store.client.city }}</div>
				</div>
			</div>

			<div class="stats">
				<div class="stat"><div class="stat__v">{{ store.client.orders_count }}</div><div class="stat__l">заказа</div></div>
				<div class="stat"><div class="stat__v">{{ kMoney(store.client.ltv) }}</div><div class="stat__l">LTV ₽</div></div>
				<div class="stat"><div class="stat__v">{{ store.client.avg_csat }}</div><div class="stat__l">CSAT</div></div>
			</div>

			<div class="sec">ПОСЛЕДНИЕ ЗАКАЗЫ</div>
			<div v-for="o in orders" :key="o.order_id" class="order">
				<div class="order__r1"><span class="order__id">{{ o.order_id }}</span><b>{{ money(o.amount) }}</b></div>
				<div class="order__items">{{ o.items }} · {{ orderDate(o.date) }}</div>
				<order-status :status="o.status" />
				<base-ui-button
					v-if="'проблема' === o.status"
					class="order__btn"
					:size="SIZE.small"
					@click="store.actionType = 'return'"
				>
					Оформить возврат
				</base-ui-button>
				<base-ui-button
					v-if="'возврат оформлен' === o.status"
					class="order__btn"
					:variant="VARIANT.secondary"
					:size="SIZE.small"
					disabled
				>
					✓ Возврат оформлен
				</base-ui-button>
			</div>
			<div v-if="!orders.length" class="muted">Нет заказов</div>

			<div class="sec">ПРОШЛЫЕ ОБРАЩЕНИЯ</div>
			<div
				v-for="t in past"
				:key="t.ticket_id"
				class="past"
				title="Открыть sub-чат тикета"
				@click="store.ticketId = t.ticket_id"
			>
				<span class="past__topic">{{ shortTopic(t.topic) }}</span>
				<span class="past__st">{{ datePart(t.date).slice(0, 5) }} · {{ t.csat ? '★ ' + t.csat : 'решено' }}</span>
			</div>
			<div v-if="!past.length" class="muted">Нет закрытых обращений</div>

			<div class="sec">КОНТЕКСТ</div>
			<div class="kv"><span class="kv__k">Канал</span><span class="kv__v">{{ store.client.channel }}</span></div>
			<div class="kv"><span class="kv__k">Сегмент</span><span class="kv__v">{{ store.client.segment }}, {{ store.client.status.toLowerCase() }}</span></div>
			<div class="kv"><span class="kv__k">Любимый магазин</span><span class="kv__v">{{ store.client.fav_store }}</span></div>

			<template v-if="store.intent">
				<div class="sec">БАЗА ЗНАНИЙ · РЕЛЕВАНТНО ДЛЯ ДИАЛОГА</div>
				<div v-for="(k, i) in store.intent.kb" :key="k" class="kb">
					<span class="kb__n">{{ i + 1 }}</span><span>{{ k }}</span>
				</div>
			</template>

			<base-ui-button
				class="client__360"
				:variant="VARIANT.secondary"
				@click="store.client360Id = store.client.client_id"
			>
				Карточка клиента 360 →
			</base-ui-button>
		</div>
	</aside>
</template>

<style scoped lang="scss">
.client {
	flex:         none;
	width:        330px;
	min-height:   0;
	overflow-y:   auto;
	background:   var(--crm-panel);
	border-left:  1px solid var(--crm-line);

	&__inner {
		padding: 16px;
	}

	&__top {
		display:     flex;
		gap:         11px;
		align-items: center;
	}

	&__name {
		font-size:   16px;
		font-weight: 700;
	}

	&__id {
		margin-top: 2px;
		font-size:  12px;
		color:      var(--crm-ink3);
	}

	&__360 {
		width:      100%;
		margin-top: 16px;
	}
}

.stats {
	display:    flex;
	gap:        8px;
	margin-top: 13px;
}

.stat {
	flex:          1;
	padding:       9px 6px;
	text-align:    center;
	background:    var(--crm-bg);
	border:        1px solid var(--crm-line);
	border-radius: 10px;

	&__v {
		font-size:   17px;
		font-weight: 800;
	}

	&__l {
		margin-top:     2px;
		font-size:      10px;
		letter-spacing: 0.3px;
		color:          var(--crm-ink3);
	}
}

.sec {
	margin:         18px 0 9px;
	font-size:      11px;
	font-weight:    800;
	letter-spacing: 0.8px;
	color:          var(--crm-ink3);
}

.order {
	padding:       10px 12px;
	margin-bottom: 8px;
	border:        1px solid var(--crm-line);
	border-radius: 11px;

	&__r1 {
		display:         flex;
		justify-content: space-between;
		gap:             8px;
		font-size:       13px;
	}

	&__id {
		font-family: ui-monospace, Consolas, monospace;
		font-size:   12px;
		font-weight: 700;
	}

	&__items {
		margin-bottom: 6px;
		margin-top:    3px;
		overflow:      hidden;
		font-size:     12px;
		color:         var(--crm-ink2);
		text-overflow: ellipsis;
		white-space:   nowrap;
	}

	&__btn {
		width:      100%;
		margin-top: 8px;
	}
}

.past {
	display:         flex;
	justify-content: space-between;
	gap:             10px;
	padding:         6px 0;
	font-size:       13px;
	cursor:          pointer;
	border-bottom:   1px dashed var(--crm-line);

	&:last-of-type {
		border-bottom: none;
	}

	&:hover &__topic {
		color: var(--crm-orange);
	}

	&__st {
		font-weight: 700;
		color:       var(--crm-green);
		white-space: nowrap;
	}
}

.kv {
	display:         flex;
	justify-content: space-between;
	gap:             10px;
	padding:         5px 0;
	font-size:       13px;

	&__k {
		color: var(--crm-ink3);
	}

	&__v {
		font-weight: 700;
		text-align:  right;
	}
}

.kb {
	display:     flex;
	gap:         9px;
	padding:     6px 0;
	font-size:   13px;
	line-height: 1.4;
	color:       var(--crm-ink2);

	&__n {
		display:         flex;
		flex:            none;
		align-items:     center;
		justify-content: center;
		width:           18px;
		height:          18px;
		margin-top:      1px;
		font-size:       11px;
		font-weight:     800;
		color:           var(--crm-ai);
		background:      var(--crm-ai-bg);
		border-radius:   50%;
	}
}

.muted {
	font-size: 12px;
	color:     var(--crm-ink3);
}
</style>
