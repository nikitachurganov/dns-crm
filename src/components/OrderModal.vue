<script setup lang="ts">
import {computed, ref} from 'vue';
import {Modal, SIZES} from '@dns-modules/modal';
import {AutoSearchInput, COLORS as SEARCH_COLORS, SIZES as SEARCH_SIZES} from '@dns-modules/search-input';
import type {Order} from '../types';
import {orderLines} from '../utils/order';
import OrderInfo from './OrderInfo.vue';
import OrderLine from './OrderLine.vue';

import '@dns-modules/modal/style.css';
import '@dns-modules/search-input/style.css';

/**
 * Модал заказа: слева сведения из карточки правой панели, справа товары отдельными плашками с поиском по названию
 */

const props = defineProps<{order: Order}>();

defineEmits<{close: []}>();

const query = ref('');

const lines = computed(() => orderLines(props.order));

const found = computed(() => {
	const q = query.value.trim().toLowerCase();

	return q ? lines.value.filter((line) => line.name.toLowerCase().includes(q)) : lines.value;
});
</script>

<template>
	<modal has-cross :size="SIZES.lg" @close="$emit('close')">
		<template #title>Детали заказа</template>

		<div class="order-modal modal-body">
			<order-info class="order-modal__info" :order="order" />

			<div class="order-modal__products">
				<auto-search-input
					v-model="query"
					:size="SEARCH_SIZES.small"
					:color="SEARCH_COLORS.grey"
					label=""
					placeholder="Поиск по товарам"
				/>

				<ul v-if="found.length" class="order-modal__list">
					<li v-for="line in found" :key="line.name" class="order-modal__item">
						<order-line :line="line" />
					</li>
				</ul>
				<p v-else class="order-modal__empty">Ничего не найдено</p>
			</div>
		</div>
	</modal>
</template>

<style scoped lang="scss">
.order-modal {
	display:               grid;
	grid-template-columns: minmax(260px, 1fr) minmax(0, 1.5fr);
	gap:                   24px;
	align-items:           start;

	// На узком экране колонки встают друг под друга
	@media (max-width: 800px) {
		grid-template-columns: 1fr;
	}

	&__info,
	&__item {
		overflow:      hidden;
		border:        1px solid var(--crm-line);
		border-radius: 12px;
	}

	// Каждый товар — отдельная плашка; список прокручивается внутри колонки, а не растягивает модал
	&__list {
		display:        flex;
		flex-direction: column;
		gap:            8px;
		max-height:     60vh;
		padding:        0;
		margin:         12px 0 0;
		overflow-y:     auto;
		list-style:     none;
	}

	&__empty {
		margin:     24px 0 8px;
		color:      var(--crm-ink3);
		text-align: center;
	}
}
</style>
