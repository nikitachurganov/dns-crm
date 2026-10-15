<script setup lang="ts">
import {computed} from 'vue';
import {useCrmStore} from '../stores/crm';
import type {Order} from '../types';
import {money} from '../utils/format';
import {orderDelivery} from '../utils/order';
import OrderHead from './OrderHead.vue';

/**
 * Сведения о заказе: номер, дата и статусы, способ получения, адрес или филиал, итог.
 * Общий блок карточки в правой панели и модала заказа
 */

const props = defineProps<{order: Order}>();

const store = useCrmStore();

const delivery = computed(() => orderDelivery(props.order, store.client?.city));
</script>

<template>
	<div class="info">
		<order-head class="info__head" :order="order" />

		<div class="info__block">
			<div class="info__label">Способ получения</div>
			<div class="info__value">{{ delivery.method }}</div>
		</div>

		<div class="info__block">
			<div class="info__label">{{ delivery.label }}</div>
			<div class="info__value">{{ delivery.value }}</div>
		</div>

		<div class="info__total">
			<span>Итого:</span>
			<b>{{ money(order.amount) }}</b>
		</div>
	</div>
</template>

<style scoped lang="scss">
.info {
	&__head {
		padding: 14px 14px 12px;
	}

	&__block {
		padding:    10px 14px;
		border-top: 1px solid var(--crm-line);
	}

	// Способ получения и адрес/филиал идут одной группой — без линии между ними
	&__block + &__block {
		padding-top: 0;
		border-top:  0;
	}

	&__label {
		font-size: 14px;
		color:     var(--crm-ink3);
	}

	&__value {
		margin-top:  2px;
		font-size:   16px;
		line-height: 1.3;
		color:       var(--crm-ink);
	}

	&__total {
		display:         flex;
		gap:             8px;
		align-items:     baseline;
		justify-content: space-between;
		padding:         12px 14px;
		font-size:       16px;
		border-top:      1px solid var(--crm-line);

		b {
			font-size:   16px;
			white-space: nowrap;
		}
	}
}
</style>
