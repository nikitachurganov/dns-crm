<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {SIZES as TAB_SIZES, Tab, TabList, TYPES} from '@dns-modules/base-ui-tabs';
import {Modal, SIZES} from '@dns-modules/modal';
import {useCrmStore} from '../stores/crm';
import {dateKey, kMoney, longTime, money, monthName, shortTopic} from '../utils/format';
import UserAvatar from './UserAvatar.vue';

import '@dns-modules/base-ui-tabs/style.css';
import '@dns-modules/modal/style.css';

/**
 * Карточка клиента 360: профиль и общая лента заказов и обращений
 */

type Category = 'all' | 'order' | 'ticket' | 'return' | 'warranty';

interface TimelineEvent {
	type: 'order' | 'ticket';
	cat: Category;
	date: string;
	title: string;
	color: string;
	desc: string;
	tags: string[];
	alert: boolean;
}

const store    = useCrmStore();
const category = ref<Category>('all');

const client = computed(() => (store.client360Id ? store.clientById(store.client360Id) : undefined));

watch(() => store.client360Id, () => {
	category.value = 'all';
});

const events = computed<TimelineEvent[]>(() => {
	const cid = store.client360Id;

	if (!cid) {
		return [];
	}

	const result: TimelineEvent[] = [];

	for (const o of store.ordersOf(cid)) {
		let title = 'Заказ оформлен: ' + o.items;
		let color = 'var(--crm-blue)';

		if (['получен', 'доставлен'].includes(o.status)) {
			title = 'Получено: ' + o.items;
			color = 'var(--crm-green)';
		}
		if (['в пути', 'частично доставлен'].includes(o.status)) {
			title = 'Доставка: ' + o.items;
		}
		if ('возврат оформлен' === o.status) {
			title = 'Возврат оформлен: ' + o.items;
			color = '#f59e0b';
		}

		result.push({
			type:  'order',
			cat:   'возврат оформлен' === o.status ? 'return' : 'order',
			date:  o.date,
			title,
			color,
			desc:  `${o.delivery}, оплата — ${o.channel.toLowerCase()}.`,
			tags:  [o.order_id, money(o.amount), o.channel.toLowerCase()],
			alert: false,
		});
	}

	for (const t of store.ticketsOf(cid)) {
		const open = 'решено' !== t.status;

		result.push({
			type:  'ticket',
			cat:   'возврат' === t.category ? 'return' : ('гарантия' === t.category ? 'warranty' : 'ticket'),
			date:  t.date,
			title: 'Обращение: ' + shortTopic(t.topic).toLowerCase(),
			color: open ? 'var(--crm-red)' : 'var(--crm-green)',
			desc:  t.topic + (open ? '. Открыт диалог, в работе.' : `. Закрыто${'1' === t.fcr ? ' с первого контакта (FCR)' : ''}.`),
			tags:  ['тикет ' + t.ticket_id, t.status, 'оператор: ' + t.operator, ...(t.csat ? ['CSAT ' + t.csat] : [])],
			alert: open,
		});
	}

	return result.sort((a, b) => dateKey(b.date).localeCompare(dateKey(a.date)));
});

const tabs = computed(() => {
	const count = (fn: (e: TimelineEvent) => boolean) => events.value.filter(fn).length;

	return [
		{id: 'all', title: 'Всё', count: events.value.length},
		{id: 'order', title: 'Заказы', count: count((e) => 'order' === e.type)},
		{id: 'ticket', title: 'Обращения', count: count((e) => 'ticket' === e.type)},
		{id: 'return', title: 'Возвраты', count: count((e) => 'return' === e.cat)},
		{id: 'warranty', title: 'Гарантия', count: count((e) => 'warranty' === e.cat)},
	];
});

const visible = computed(() => events.value.filter((e) => 'all' === category.value || e.type === category.value || e.cat === category.value));
</script>

<template>
	<modal v-if="client" has-cross :size="SIZES.xl" @close="store.client360Id = null">
		<template #title>Карточка клиента 360</template>

		<div class="m360">
			<aside class="m360__left">
				<user-avatar class="m360__ava" :name="client.name" :size="84" />
				<h3 class="m360__name">{{ client.name }}</h3>
				<div class="m360__sub">ID {{ client.client_id }} · клиент с {{ monthName(client.client_since) }}</div>
				<div class="tags">
					<span v-if="'VIP' === client.segment" class="tag tag--vip">VIP</span>
					<span class="tag tag--act">{{ client.status }}</span>
					<span class="tag tag--ch">{{ client.channel }}</span>
				</div>

				<div class="stats">
					<div class="stat"><div class="stat__v">{{ client.orders_count }}</div><div class="stat__l">всего заказов</div></div>
					<div class="stat"><div class="stat__v">{{ kMoney(client.ltv) }}</div><div class="stat__l">LTV, ₽</div></div>
					<div class="stat"><div class="stat__v">{{ client.avg_csat }}</div><div class="stat__l">средний CSAT</div></div>
					<div class="stat"><div class="stat__v">{{ client.tickets_count }}</div><div class="stat__l">обращений</div></div>
				</div>

				<div class="sec">КОНТАКТЫ</div>
				<div class="kv"><span class="kv__k">Телефон</span><span class="kv__v">{{ client.phone }}</span></div>
				<div class="kv"><span class="kv__k">Email</span><span class="kv__v">{{ client.email }}</span></div>
				<div class="kv"><span class="kv__k">Город</span><span class="kv__v">{{ client.city }}</span></div>
				<div class="sec">ПРЕДПОЧТЕНИЯ</div>
				<div class="kv"><span class="kv__k">Магазин</span><span class="kv__v">{{ client.fav_store }}</span></div>
				<div class="kv"><span class="kv__k">Способ выдачи</span><span class="kv__v">{{ client.pickup_method }}</span></div>
				<div class="kv"><span class="kv__k">Часовой пояс</span><span class="kv__v">{{ client.timezone }}</span></div>
				<div class="sec">ПРОГРАММА ЛОЯЛЬНОСТИ</div>
				<div class="kv"><span class="kv__k">Бонусов</span><span class="kv__v">{{ Number(client.bonus).toLocaleString('ru-RU') }} Б</span></div>
				<div class="kv"><span class="kv__k">ProZaPass</span><span class="kv__v">{{ client.prozapass_until ? 'до ' + client.prozapass_until : '—' }}</span></div>
			</aside>

			<div class="m360__right">
				<tab-list class="m360__tabs" :type="TYPES.text" :tabs="tabs">
					<template #default="{id, title, count}">
						<tab :type="TYPES.text" :size="TAB_SIZES.small" :is-active="category === id" @click="category = id as Category">
							{{ title }} · {{ count }}
						</tab>
					</template>
				</tab-list>

				<div class="timeline">
					<div v-for="(e, i) in visible" :key="i" class="tl">
						<span class="tl__dot" :style="{borderColor: e.color}" />
						<div class="tl__card" :class="{'tl__card--alert': e.alert}">
							<div class="tl__r1"><b>{{ e.title }}</b><span class="tl__dt">{{ longTime(e.date) }}</span></div>
							<p class="tl__desc">{{ e.desc }}</p>
							<div class="tl__tags"><span v-for="tag in e.tags" :key="tag" class="tl__tag">{{ tag }}</span></div>
						</div>
					</div>
					<div v-if="!visible.length" class="empty">Нет событий в этой категории</div>
				</div>
			</div>
		</div>
	</modal>
</template>

<style scoped lang="scss">
.m360 {
	display:    flex;
	min-height: 0;
	height:     60vh;

	&__left {
		flex:         none;
		width:        290px;
		padding:      6px 20px 0 4px;
		overflow-y:   auto;
		border-right: 1px solid var(--crm-line);
	}

	&__ava {
		margin: 0 auto;
	}

	&__name {
		margin:     12px 0 0;
		font-size:  18px;
		text-align: center;
	}

	&__sub {
		margin-top: 3px;
		font-size:  12px;
		color:      var(--crm-ink3);
		text-align: center;
	}

	&__right {
		display:        flex;
		flex:           1;
		flex-direction: column;
		min-width:      0;
	}

	&__tabs {
		padding: 0 18px 8px;
	}
}

.tags {
	display:         flex;
	flex-wrap:       wrap;
	gap:             6px;
	justify-content: center;
	margin-top:      10px;
}

.tag {
	padding:       3px 8px;
	font-size:     11px;
	font-weight:   700;
	border-radius: 6px;

	&--vip {
		color:      #c02626;
		background: #fde8e8;
	}

	&--act {
		color:      var(--crm-green);
		background: var(--crm-green-bg);
	}

	&--ch {
		color:      var(--crm-blue);
		background: var(--crm-blue-bg);
	}
}

.stats {
	display:               grid;
	grid-template-columns: 1fr 1fr;
	gap:                   8px;
	margin-top:            16px;
}

.stat {
	padding:       9px 6px;
	text-align:    center;
	background:    var(--crm-bg);
	border:        1px solid var(--crm-line);
	border-radius: 10px;

	&__v {
		font-size:   19px;
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

.timeline {
	flex:       1;
	padding:    8px 4px 0 20px;
	overflow-y: auto;
}

.tl {
	position:       relative;
	display:        flex;
	gap:            14px;
	padding-bottom: 16px;

	&::before {
		content:    '';
		position:   absolute;
		top:        20px;
		bottom:     -2px;
		left:       6.5px;
		width:      2px;
		background: var(--crm-line);
	}

	&:last-child::before {
		display: none;
	}

	&__dot {
		z-index:       1;
		flex:          none;
		width:         15px;
		height:        15px;
		margin-top:    3px;
		background:    var(--crm-panel);
		border:        3.5px solid;
		border-radius: 50%;
	}

	&__card {
		flex:          1;
		min-width:     0;
		padding:       11px 13px;
		border:        1px solid var(--crm-line);
		border-radius: 11px;

		&--alert {
			background:   var(--crm-red-bg);
			border-color: #f6cfcf;
		}
	}

	&__r1 {
		display:         flex;
		justify-content: space-between;
		gap:             10px;
	}

	&__dt {
		flex:      none;
		font-size: 12px;
		color:     var(--crm-ink3);
	}

	&__desc {
		margin:      4px 0 0;
		font-size:   13px;
		line-height: 1.45;
		color:       var(--crm-ink2);
	}

	&__tags {
		display:    flex;
		flex-wrap:  wrap;
		gap:        6px;
		margin-top: 8px;
	}

	&__tag {
		padding:       2px 7px;
		font-size:     11px;
		color:         var(--crm-ink2);
		border:        1px solid var(--crm-line);
		border-radius: 6px;
	}
}

.empty {
	padding:    30px 16px;
	color:      var(--crm-ink3);
	text-align: center;
}
</style>
