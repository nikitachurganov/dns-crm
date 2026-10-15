<script setup lang="ts">
import {computed} from 'vue';
import {Status} from '@dns-modules/status';
import type {Order} from '../types';
import {orderPayment, orderTracking, shortDate} from '../utils/order';
import OrderStatus from './OrderStatus.vue';

import '@dns-modules/status/style.css';

/**
 * Номер и дата заказа со статусами оплаты и трекинга: шапка карточки в правой панели и шапка модала заказа
 */

const props = defineProps<{order: Order}>();

const payment  = computed(() => orderPayment(props.order));
const tracking = computed(() => orderTracking(props.order));
</script>

<template>
	<div class="head">
		<h3 class="head__title">Заказ {{ order.order_id }} <span class="head__from">от {{ shortDate(order.date) }}</span></h3>
		<div class="head__badges">
			<status :color="'Оплачен' === payment ? 'green' : 'orange'" has-outline>{{ payment }}</status>
			<order-status :status="tracking" />
		</div>
	</div>
</template>

<style scoped lang="scss">
.head {
	&__title {
		margin:      0;
		font-size:   16px;
		font-weight: 700;
		line-height: 1.25;
	}

	// Дата — обычным начертанием и вторичным цветом
	&__from {
		font-weight: 400;
		color:       var(--text-secondary, #4e4e4e);
	}

	&__badges {
		display:     flex;
		flex-wrap:   wrap;
		gap:         6px;
		align-items: center;
		margin-top:  8px;
	}
}
</style>
