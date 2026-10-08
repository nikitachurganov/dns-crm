<script setup lang="ts">
import {computed, reactive, watch} from 'vue';
import {BaseUiButton, VARIANT} from '@dns-modules/base-ui-button';
import {Modal, SIZES} from '@dns-modules/modal';
import {useCrmStore} from '../stores/crm';
import type {ActionType} from '../types';
import {money} from '../utils/format';
import FormSelect from './FormSelect.vue';

import '@dns-modules/base-ui-button/style.css';
import '@dns-modules/modal/style.css';

/**
 * Модальное окно оформления возврата, обмена или гарантийного ремонта
 */

const store = useCrmStore();

interface Field {
	key: 'order' | 'way' | 'time' | 'swap';
	label: string;
	options: string[];
	value: string;
}

const form = reactive<Record<Field['key'], string>>({order: '', way: '', time: '', swap: ''});

const orderOptions = computed(() => (store.chat
	? store.ordersOf(store.chat.client_id).map((o) => `${o.order_id} · ${o.items} · ${money(o.amount)}`)
	: []));

/** Проблемный заказ или первый в списке */
const defaultOrder = computed(() => {
	if (!store.chat) {
		return '';
	}

	const orders = store.ordersOf(store.chat.client_id);
	const target = orders.find((o) => 'проблема' === o.status) ?? orders[0];
	const idx    = target ? orders.indexOf(target) : -1;

	return orderOptions.value[idx] ?? '';
});

type ActionConfig = {title: string; note: string; fields: () => Field[]};

const CONFIG: Record<ActionType, ActionConfig> = {
	transfer: {title: '', note: '', fields: () => []},
	service:  {title: '', note: '', fields: () => []},
	return: {
		title:  'Оформить возврат',
		note:   'Возврат средств — до 5 дней после приёмки. Заявление за клиента формируется автоматически, подпись — у курьера.',
		fields: () => [
			{key: 'order', label: 'Заказ', options: orderOptions.value, value: defaultOrder.value},
			{key: 'way', label: 'Способ', options: ['Забор курьером из дома', 'Клиент привезёт в магазин'], value: 'Забор курьером из дома'},
			{key: 'time', label: 'Время забора', options: ['Сегодня, 18:00–21:00', 'Завтра, после 18:00', 'Завтра, 14:00–18:00'], value: 'Завтра, после 18:00'},
		],
	},
	exchange: {
		title:  'Оформить обмен',
		note:   'Товар не использовался, чек есть — обмен без экспертизы, в магазине займёт ~5 минут.',
		fields: () => [
			{key: 'order', label: 'Заказ', options: orderOptions.value, value: orderOptions.value[0] ?? ''},
			{key: 'swap', label: 'Товар на замену', options: ['JBL Tune 520BT · 3 990 ₽ (без доплаты)', 'JBL Tune 720BT · 5 490 ₽ (доплата 1 500 ₽)'], value: 'JBL Tune 520BT · 3 990 ₽ (без доплаты)'},
			{key: 'way', label: 'Где обменять', options: ['ТРЦ Острова (любимый магазин)', 'Любой магазин DNS'], value: 'ТРЦ Острова (любимый магазин)'},
		],
	},
	warranty: {
		title:  'Гарантийный ремонт',
		note:   'Диагностика — до 3 рабочих дней. Чек не нужен: покупка подтверждается по номеру заказа.',
		fields: () => [
			{key: 'order', label: 'Заказ', options: orderOptions.value, value: orderOptions.value[0] ?? ''},
			{key: 'way', label: 'Сервисный центр', options: ['СЦ DNS, Уссурийск (приём в любом магазине)', 'Авторизованный СЦ Dyson, Владивосток'], value: 'СЦ DNS, Уссурийск (приём в любом магазине)'},
			{key: 'time', label: 'Подменный товар', options: ['Не требуется', 'Запросить подменный пылесос'], value: 'Не требуется'},
		],
	},
};

CONFIG.transfer = {
	title:  'Перевести на другого оператора / линию',
	note:   'Клиент останется в этом чате, история переписки и AI-контекст перейдут к новому оператору.',
	fields: () => [
		{key: 'way', label: 'Куда перевести', options: ['Линия: гарантия и сервис', 'Линия: доставка', 'Линия: оплата и кредиты', 'Старший смены', 'Оператор: Сергей В.'], value: 'Линия: гарантия и сервис'},
		{key: 'time', label: 'Приоритет', options: ['Обычный', 'Срочно'], value: 'Обычный'},
	],
};

CONFIG.service = {
	title:  'Создать заявку в СЦ',
	note:   'Заявка уйдёт в сервисный центр, клиент получит номер заявки и адрес приёма в чате.',
	fields: () => [
		{key: 'order', label: 'Заказ', options: orderOptions.value, value: defaultOrder.value},
		{key: 'way', label: 'Сервисный центр', options: ['СЦ DNS, Уссурийск (приём в любом магазине)', 'СЦ DNS, Хабаровск', 'Авторизованный СЦ, Владивосток'], value: 'СЦ DNS, Уссурийск (приём в любом магазине)'},
		{key: 'time', label: 'Тип обращения', options: ['Диагностика', 'Гарантийный ремонт', 'Замена товара'], value: 'Диагностика'},
	],
};

const config = computed(() => (store.actionType ? CONFIG[store.actionType] : null));
const fields = computed(() => config.value?.fields() ?? []);

watch(() => store.actionType, () => {
	Object.assign(form, {order: '', way: '', time: '', swap: ''});
	for (const f of fields.value) {
		form[f.key] = f.value;
	}
}, {immediate: true});

function confirm() {
	store.confirmAction({
		orderId: form.order.split(' ·')[0] ?? '',
		way:     form.way,
		time:    form.time,
		swap:    form.swap,
	});
}
</script>

<template>
	<modal v-if="config" has-cross :size="SIZES.sm" @close="store.actionType = null">
		<template #title>{{ config.title }}</template>

		<div class="fields">
			<form-select
				v-for="f in fields"
				:key="f.key"
				v-model="form[f.key]"
				:label="f.label"
				:options="f.options"
			/>
			<div class="note">{{ config.note }}</div>
		</div>

		<template #footer="{close}">
			<div class="footer">
				<base-ui-button :variant="VARIANT.secondary" @click="close()">Отмена</base-ui-button>
				<base-ui-button @click="confirm()">Подтвердить</base-ui-button>
			</div>
		</template>
	</modal>
</template>

<style scoped lang="scss">
.fields {
	display:        flex;
	flex-direction: column;
	gap:            12px;
}

.note {
	padding:       9px 12px;
	font-size:     13px;
	line-height:   1.45;
	color:         #1e3a8a;
	background:    var(--crm-blue-bg);
	border-radius: 9px;
}

.footer {
	display:         flex;
	gap:             10px;
	justify-content: flex-end;
}
</style>
