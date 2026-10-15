<script setup lang="ts">
import {computed} from 'vue';
import {BaseUiButton, BaseUiIconButton, SIZE, VARIANT} from '@dns-modules/base-ui-button';
import {IconActionClose, IconBusinessBonus} from '@dns-modules/font-icon-v3';
import {useCrmStore} from '../stores/crm';
import OrderActions from './OrderActions.vue';
import OrderCard from './OrderCard.vue';

import '@dns-modules/base-ui-button/style.css';

/**
 * Правая панель: данные клиента, активный заказ и быстрые действия
 */

const store = useCrmStore();

/** Баланс бонусов: «2 450» — единица измерения показывается иконкой */
const bonus = computed(() => (Number(store.client?.bonus) || 0).toLocaleString('ru-RU'));
</script>

<template>
	<aside class="client">
		<header class="client__head">
			<h2 class="client__title">Детали обращения</h2>
			<base-ui-icon-button
				:variant="VARIANT.secondary"
				:size="SIZE.tiny"
				title="Закрыть"
				aria-label="Закрыть детали обращения"
				@click="store.isDetailsOpen = false"
			>
				<icon-action-close />
			</base-ui-icon-button>
		</header>
		<div v-if="store.client" class="client__inner">
			<div class="client__top">
				<div class="client__who">
					<div class="client__name">{{ store.client.name }}</div>
					<div class="client__id">ID {{ store.client.client_id }}</div>
				</div>
			</div>

			<dl class="data">
				<div class="data__row">
					<dt>Телефон</dt>
					<dd>{{ store.client.phone }}</dd>
				</div>
				<div class="data__row">
					<dt>Email</dt>
					<dd>{{ store.client.email }}</dd>
				</div>
				<div class="data__row">
					<dt>Город</dt>
					<dd>{{ store.client.city }}</dd>
				</div>
				<div class="data__row">
					<dt>Программа лояльности</dt>
					<dd>
						<span class="data__bonus" title="Бонусы">
							{{ bonus }}
							<icon-business-bonus class="data__bonus-icon" aria-label="бонусов" />
						</span>
					</dd>
				</div>
			</dl>

			<!-- Карточка клиента 360 открывается из блока с данными о человеке -->
			<base-ui-button
				class="client__details"
				:variant="VARIANT.secondary"
				:size="SIZE.small"
				@click="store.client360Id = store.client.client_id"
			>
				Подробнее
			</base-ui-button>

			<order-card v-if="store.activeOrder" :order="store.activeOrder" />
			<div v-else class="muted">Нет заказов</div>
		</div>

		<!-- Быстрые действия закреплены внизу панели и не прокручиваются вместе с содержимым -->
		<footer v-if="store.client" class="client__footer">
			<order-actions />
		</footer>
	</aside>
</template>

<style scoped lang="scss">
.client {
	display:        flex;
	flex:           none;
	flex-direction: column;
	width:          380px;
	min-height:     0;
	overflow:       hidden;
	background:     var(--crm-panel);
	border-left:    1px solid var(--crm-line);

	// Шапка как у списка чатов: крупный заголовок и светлый разделитель
	&__head {
		display:         flex;
		flex:            none;
		gap:             12px;
		align-items:     center;
		justify-content: space-between;
		padding:         20px 16px 12px;
		background:    var(--crm-panel);
		border-bottom: 1px solid var(--stroke-border-light, #eee);
	}

	&__title {
		margin:      0;
		font-size:   20px;
		font-weight: 700;
		line-height: 26px;
	}

	// Прокручивается только содержимое между шапкой и кнопками
	&__inner {
		flex:       1;
		min-height: 0;
		padding:    16px;
		overflow-y: auto;
	}

	&__footer {
		flex:       none;
		padding:    12px 16px 16px;
		border-top: 1px solid var(--stroke-border-light, #eee);
	}

	&__top {
		display:     flex;
		gap:         12px;
		align-items: center;
	}

	&__who {
		flex:      1;
		min-width: 0;
	}

	// Кнопка «Подробнее» под данными о клиенте — во всю ширину колонки
	&__details {
		width:      100%;
		margin-top: 12px;
	}

	&__name {
		font-size:   16px;
		font-weight: 700;
	}

	&__id {
		margin-top: 2px;
		font-size:  14px;
		color:      var(--crm-ink3);
	}
}

.data {
	display:        flex;
	flex-direction: column;
	gap:            2px;
	margin:         12px 0 0;

	// «Подпись: значение» в одну строку, значение сразу после двоеточия
	&__row {
		display:     flex;
		flex-wrap:   wrap;
		gap:         0 6px;
		align-items: baseline;
		min-height:  24px;
		font-size:   16px;

		dt {
			flex:  none;
			color: var(--crm-ink3);

			&::after {
				content: ':';
			}
		}

		dd {
			min-width:     0;
			margin:        0;
			overflow-wrap: anywhere;
		}
	}

	&__bonus {
		display:     inline-flex;
		gap:         4px;
		align-items: center;
	}

	&__bonus-icon {
		font-size: 16px;
		color:     var(--crm-ink);
	}
}

.muted {
	margin-top: 18px;
	font-size:  14px;
	color:      var(--crm-ink3);
}
</style>
