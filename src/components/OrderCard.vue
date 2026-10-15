<script setup lang="ts">
import {computed, ref} from 'vue';
import {BaseUiButton, SIZE, VARIANT} from '@dns-modules/base-ui-button';
import type {Order} from '../types';
import {orderLines} from '../utils/order';
import OrderInfo from './OrderInfo.vue';
import OrderLine from './OrderLine.vue';
import OrderModal from './OrderModal.vue';

import '@dns-modules/base-ui-button/style.css';

/**
 * Карточка заказа: сведения о заказе и состав. В карточке видны первые три позиции,
 * а кнопка «Посмотреть все» открывает модал заказа с полной информацией и всеми товарами
 */

/** Сколько позиций показывать в карточке */
const MAX_VISIBLE = 3;

const props = defineProps<{order: Order}>();

const lines = computed(() => orderLines(props.order));

const isModalOpen  = ref(false);
const visibleLines = computed(() => lines.value.slice(0, MAX_VISIBLE));
const hiddenCount  = computed(() => lines.value.length - visibleLines.value.length);
</script>

<template>
	<section class="order">
		<order-info :order="order" />

		<ul class="lines">
			<li v-for="line in visibleLines" :key="line.name" class="lines__item">
				<order-line :line="line" />
			</li>
		</ul>

		<div v-if="hiddenCount" class="order__more">
			<base-ui-button :variant="VARIANT.secondary" :size="SIZE.small" @click="isModalOpen = true">
				Посмотреть все ({{ lines.length }})
			</base-ui-button>
		</div>

		<order-modal v-if="isModalOpen" :order="order" @close="isModalOpen = false" />
	</section>
</template>

<style scoped lang="scss">
// Карточка заказа по макету мобильного приложения: блоки разделены линиями, сумма и товар внизу
.order {
	margin:        18px 0 4px;
	overflow:      hidden;
	background:    var(--crm-panel);
	border:        1px solid var(--crm-line);
	border-radius: 12px;

	// Кнопка «Посмотреть все» под списком товаров
	&__more {
		padding:    10px 14px 14px;
		border-top: 1px solid var(--crm-line);
	}
}

.lines {
	padding:    0;
	margin:     0;
	list-style: none;
	border-top: 1px solid var(--crm-line);
}

.lines__item + .lines__item {
	border-top: 1px solid var(--crm-line);
}
</style>
