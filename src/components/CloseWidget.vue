<script setup lang="ts">
import {ref} from 'vue';
import {BaseUiButton, SIZE, VARIANT} from '@dns-modules/base-ui-button';
import {useCrmStore} from '../stores/crm';
import type {Ticket} from '../types';

import '@dns-modules/base-ui-button/style.css';

/**
 * Симуляция виджета на стороне клиента: «Проблема решена?» и оценка работы поддержки
 */

const props = defineProps<{ticket: Ticket}>();

const store = useCrmStore();
const hover = ref(0);
</script>

<template>
	<div class="widget">
		<div class="widget__head">📱 ВИДИТ КЛИЕНТ · ПОДТВЕРЖДЕНИЕ РЕШЕНИЯ</div>

		<template v-if="!props.ticket.saidYes">
			<div class="widget__q">Проблема решена?</div>
			<div class="widget__btns">
				<base-ui-button :size="SIZE.small" @click="store.clientSaysYes(props.ticket)">Да</base-ui-button>
				<base-ui-button :variant="VARIANT.secondary" :size="SIZE.small" @click="store.clientSaysNo(props.ticket)">Нет</base-ui-button>
			</div>
		</template>

		<template v-else>
			<div class="widget__q">Спасибо! Оцените работу поддержки:</div>
			<div class="widget__stars" @mouseleave="hover = 0">
				<button
					v-for="i in 5"
					:key="i"
					class="widget__star"
					:class="{'widget__star--lit': i <= hover}"
					@mouseenter="hover = i"
					@click="store.closeTicket(props.ticket, i)"
				>
					★
				</button>
			</div>
		</template>
	</div>
</template>

<style scoped lang="scss">
.widget {
	align-self:    flex-start;
	max-width:     70%;
	padding:       13px 15px;
	background:    var(--crm-panel);
	border:        1.5px dashed #b7c3d4;
	border-radius: 14px;

	&__head {
		margin-bottom:  8px;
		font-size:      11px;
		font-weight:    700;
		letter-spacing: 0.6px;
		color:          var(--crm-ink3);
	}

	&__q {
		font-size:   15px;
		font-weight: 700;
	}

	&__btns {
		display:    flex;
		gap:        8px;
		margin-top: 10px;
	}

	&__stars {
		display:    flex;
		gap:        4px;
		margin-top: 10px;
	}

	&__star {
		padding:     2px;
		font-size:   26px;
		line-height: 1;
		color:       #d4dbe4;
		cursor:      pointer;
		background:  none;
		border:      none;
		transition:  transform 0.1s;

		&--lit {
			color: var(--crm-star);
		}

		&:hover {
			transform: scale(1.15);
		}
	}
}
</style>
