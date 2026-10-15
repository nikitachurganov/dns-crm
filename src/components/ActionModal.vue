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

/** Активный заказ из карточки справа */
const defaultOrder = computed(() => {
	const id = store.activeOrder?.order_id;

	return orderOptions.value.find((o) => id && o.startsWith(id)) ?? orderOptions.value[0] ?? '';
});

type ActionConfig = {title: string; note: string; fields: () => Field[]};

const SERVICE_CENTERS = ['СЦ DNS, Уссурийск (приём в любом магазине)', 'СЦ DNS, Хабаровск', 'Авторизованный СЦ, Владивосток'];

const CONFIG: Record<ActionType, ActionConfig> = {
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
			{key: 'order', label: 'Заказ', options: orderOptions.value, value: defaultOrder.value},
			{key: 'swap', label: 'Товар на замену', options: ['JBL Tune 520BT · 3 990 ₽ (без доплаты)', 'JBL Tune 720BT · 5 490 ₽ (доплата 1 500 ₽)'], value: 'JBL Tune 520BT · 3 990 ₽ (без доплаты)'},
			{key: 'way', label: 'Где обменять', options: ['ТРЦ Острова (любимый магазин)', 'Любой магазин DNS'], value: 'ТРЦ Острова (любимый магазин)'},
		],
	},
	warranty: {
		title:  'Гарантийный ремонт',
		note:   'Диагностика — до 3 рабочих дней. Чек не нужен: покупка подтверждается по номеру заказа.',
		fields: () => [
			{key: 'order', label: 'Заказ', options: orderOptions.value, value: defaultOrder.value},
			{key: 'way', label: 'Сервисный центр', options: ['СЦ DNS, Уссурийск (приём в любом магазине)', 'Авторизованный СЦ Dyson, Владивосток'], value: 'СЦ DNS, Уссурийск (приём в любом магазине)'},
			{key: 'time', label: 'Подменный товар', options: ['Не требуется', 'Запросить подменный пылесос'], value: 'Не требуется'},
		],
	},
	transfer: {
		title:  'Перевести на другого оператора',
		note:   'Клиент останется в этом чате, история переписки и AI-контекст перейдут к новому оператору.',
		fields: () => [
			{key: 'way', label: 'Куда перевести', options: ['Линия: гарантия и сервис', 'Линия: доставка', 'Линия: оплата и кредиты', 'Старший смены', 'Оператор: Сергей В.'], value: 'Линия: гарантия и сервис'},
			{key: 'time', label: 'Приоритет', options: ['Обычный', 'Срочно'], value: 'Обычный'},
		],
	},
	service: {
		title:  'Создать заявку в СЦ',
		note:   'Заявка уйдёт в сервисный центр, клиент получит номер заявки и адрес приёма в чате.',
		fields: () => [
			{key: 'order', label: 'Заказ', options: orderOptions.value, value: defaultOrder.value},
			{key: 'way', label: 'Сервисный центр', options: SERVICE_CENTERS, value: SERVICE_CENTERS[0] ?? ''},
			{key: 'time', label: 'Тип обращения', options: ['Диагностика', 'Гарантийный ремонт', 'Замена товара'], value: 'Диагностика'},
		],
	},
	reschedule: {
		title:  'Изменить дату и время доставки',
		note:   'Курьер позвонит за час до приезда. Клиент получит уведомление с новой датой.',
		fields: () => [
			{key: 'order', label: 'Заказ', options: orderOptions.value, value: defaultOrder.value},
			{key: 'way', label: 'Дата', options: ['11.07.2026, суббота', '12.07.2026, воскресенье', '13.07.2026, понедельник', '14.07.2026, вторник'], value: '11.07.2026, суббота'},
			{key: 'time', label: 'Интервал', options: ['10:00–14:00', '14:00–18:00', '18:00–21:00'], value: '14:00–18:00'},
		],
	},
	cancel: {
		title:  'Отменить заказ',
		note:   'Заказ будет отменён, деньги вернутся тем же способом в течение 5 рабочих дней. Действие нельзя отменить.',
		fields: () => [
			{key: 'order', label: 'Заказ', options: orderOptions.value, value: defaultOrder.value},
			{key: 'way', label: 'Причина', options: ['Клиент передумал', 'Долгий срок доставки', 'Нашёл дешевле', 'Ошибка в заказе', 'Другое'], value: 'Клиент передумал'},
		],
	},
	receipt: {
		title:  'Отправить чек или дубликат',
		note:   'Документ уйдёт на номер телефона или почту клиента из его карточки.',
		fields: () => [
			{key: 'order', label: 'Заказ', options: orderOptions.value, value: defaultOrder.value},
			{key: 'way', label: 'Что отправить', options: ['Чек', 'Дубликат чека', 'Дубликат накладной'], value: 'Чек'},
			{key: 'time', label: 'Куда', options: ['SMS', 'Email'], value: 'SMS'},
		],
	},
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

		<div class="fields modal-body">
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

	// Подвал с кнопками идёт следом — нижний отступ ему не нужен
	padding-bottom: 0;
}

.note {
	padding:       9px 12px;
	font-size:     14px;
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
