<script setup lang="ts">
import {BaseUiButton, SIZE, VARIANT} from '@dns-modules/base-ui-button';
import {useCrmStore} from '../stores/crm';

import '@dns-modules/base-ui-button/style.css';

/**
 * Карточка AI-помощника: намерение клиента и действия в один клик
 */

const store = useCrmStore();
</script>

<template>
	<div v-if="store.intent" class="ai">
		<div class="ai__head">⚡ AI-ПОМОЩНИК</div>
		<div class="ai__body">
			Намерение: <b>{{ store.intent.label }}</b> ·
			<span class="ai__conf">уверенность {{ store.intent.conf }}%</span>.
			{{ store.intent.note }}
		</div>
		<div class="ai__actions">
			<base-ui-button
				v-for="action in store.intent.actions"
				:key="action.id"
				:variant="action.primary ? VARIANT.primary : VARIANT.secondary"
				:size="SIZE.small"
				@click="store.runAction(action.id)"
			>
				{{ action.label }}
			</base-ui-button>
		</div>
	</div>
</template>

<style scoped lang="scss">
.ai {
	align-self:    flex-start;
	max-width:     72%;
	padding:       12px 14px;
	background:    var(--crm-ai-bg);
	border:        1px solid var(--crm-ai-line);
	border-radius: 14px;

	&__head {
		margin-bottom:  7px;
		font-size:      12px;
		font-weight:    700;
		letter-spacing: 0.6px;
		color:          var(--crm-ai);
	}

	&__body {
		font-size:   14px;
		line-height: 1.5;
		color:       #3b3355;
	}

	&__conf {
		font-weight: 700;
		color:       var(--crm-ai);
	}

	&__actions {
		display:    flex;
		flex-wrap:  wrap;
		gap:        8px;
		margin-top: 10px;
	}
}
</style>
