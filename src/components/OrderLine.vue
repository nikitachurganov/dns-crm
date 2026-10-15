<script setup lang="ts">
import {IconDataImage} from '@dns-modules/font-icon-v3';
import {money} from '../utils/format';
import type {OrderLine} from '../utils/order';

/**
 * Позиция заказа: слева плитка-заглушка, справа название (до двух строк), а под ним количество и цена
 */

defineProps<{line: OrderLine}>();
</script>

<template>
	<div class="line">
		<span class="line__thumb">
				<img v-if="line.photo" class="line__photo" :src="line.photo" :alt="line.name">
				<icon-data-image v-else />
			</span>
		<div class="line__body">
			<div class="line__name">{{ line.name }}</div>
			<div class="line__meta">
				<span class="line__qty">{{ line.qty }} шт.</span>
				<span v-if="line.price" class="line__price">{{ money(line.price) }}</span>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.line {
	display: flex;
	gap:        12px;
	box-sizing: border-box;
	height:     90px;
	padding:    12px;

	// Фото из каталога товаров, а для остальных — плитка-заглушка
	&__thumb {
		overflow:        hidden;
		display:         flex;
		flex:            none;
		align-items:     center;
		justify-content: center;
		width:           66px;
		height:          66px;
		font-size:       24px;
		color:           var(--crm-ink3);
		background:      var(--crm-bg);
		border-radius:   8px;
	}

	&__photo {
		width:      100%;
		height:     100%;
		object-fit: contain;
	}

	&__body {
		display:        flex;
		flex:           1;
		flex-direction: column;
		gap:            6px;
		justify-content: space-between;
		min-width:      0;
	}

	// Не больше двух строк, дальше многоточие
	&__name {
		display:            -webkit-box;
		overflow:           hidden;
		font-size:          16px;
		line-height:        1.3;
		overflow-wrap:      anywhere;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	// Количество слева, цена справа
	&__meta {
		display:         flex;
		gap:             8px;
		align-items:     baseline;
		justify-content: space-between;
		font-size:       14px;
		color:           var(--crm-ink2);
	}

	&__price {
		white-space: nowrap;
	}
}
</style>
