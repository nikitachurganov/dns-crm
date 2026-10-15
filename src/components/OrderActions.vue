<script setup lang="ts">
import {computed} from 'vue';
import {BaseUiButton, SIZE, VARIANT} from '@dns-modules/base-ui-button';
import {useCrmStore} from '../stores/crm';
import {isOrderOpen, orderDelivery} from '../utils/order';

import '@dns-modules/base-ui-button/style.css';

/**
 * Быстрые действия по активному заказу. Недоступные в текущем статусе заказа кнопки выключены
 */

const store = useCrmStore();

const order  = computed(() => store.activeOrder);
const isOpen = computed(() => !!order.value && isOrderOpen(order.value));

/** Перенос возможен только у доставки, которая ещё не выполнена */
const canReschedule = computed(() => !!order.value && isOpen.value && !orderDelivery(order.value).isPickup);

function run(id: 'reschedule' | 'cancel' | 'receipt') {
	store.runAction(id);
}
</script>

<template>
	<div class="actions">
		<base-ui-button
			:variant="VARIANT.secondary"
			:size="SIZE.small"
			:disabled="!isOpen"
			title="Доступно, пока заказ не получен"
			@click="run('cancel')"
		>
			Отменить заказ
		</base-ui-button>
		<base-ui-button
			:variant="VARIANT.secondary"
			:size="SIZE.small"
			:disabled="!canReschedule"
			title="Доступно для доставки, которая ещё не выполнена"
			@click="run('reschedule')"
		>
			Изменить дату/время доставки
		</base-ui-button>
		<base-ui-button
			:variant="VARIANT.secondary"
			:size="SIZE.small"
			:disabled="!order"
			@click="run('receipt')"
		>
			Отправить чек
		</base-ui-button>
	</div>
</template>

<style scoped lang="scss">
.actions {
	display:        flex;
	flex-direction: column;
	gap:            8px;

	// Кнопки на всю ширину колонки: подписи длинные, в ряд не помещаются
	:deep(button) {
		width: 100%;
	}
}
</style>
