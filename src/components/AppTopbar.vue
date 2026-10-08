<script setup lang="ts">
import {computed} from 'vue';
import {BaseUiButton, SIZE, VARIANT} from '@dns-modules/base-ui-button';
import {useCrmStore} from '../stores/crm';
import UserAvatar from './UserAvatar.vue';

import '@dns-modules/base-ui-button/style.css';

/**
 * Верхняя панель: путь, источник данных, оператор
 */

const store = useCrmStore();

const path = computed(() => {
	if (!store.chat) {
		return 'chats';
	}

	return `chats / ${store.chat.chat_id} / ticket / ${store.ticket?.ticket_id ?? ''}`;
});

const dataLabel = computed(() => (store.loadedFiles ? `Данные: CSV (${store.loadedFiles})` : 'Данные: демо'));
</script>

<template>
	<header class="topbar">
		<div class="topbar__logo">DNS Support CRM</div>
		<div class="topbar__path"><b>crm.dns-shop.ru</b> / {{ path }}</div>
		<div class="topbar__spacer" />
		<base-ui-button
			:variant="VARIANT.secondary"
			:size="SIZE.small"
			title="Загрузить выгрузку CSV из базы данных"
			@click="store.isCsvOpen = true"
		>
			<span class="topbar__dot" /> {{ dataLabel }} · Загрузить CSV
		</base-ui-button>
		<div class="topbar__operator">
			<user-avatar name="Анна К." :size="28" />
			Анна К. · оператор
		</div>
	</header>
</template>

<style scoped lang="scss">
.topbar {
	display:     flex;
	flex:        none;
	gap:         14px;
	align-items: center;
	height:      48px;
	padding:     0 16px;
	color:       #cfd6e2;
	background:  var(--crm-navy);

	&__logo {
		font-size:   16px;
		font-weight: 700;
		color:       #fff;
	}

	&__path {
		padding:       5px 12px;
		overflow:      hidden;
		font-family:   ui-monospace, Consolas, monospace;
		font-size:     12px;
		color:         #9aa7bd;
		white-space:   nowrap;
		background:    rgba(255, 255, 255, 0.08);
		border-radius: 7px;

		b {
			font-weight: 700;
			color:       #e8edf5;
		}
	}

	&__spacer {
		flex: 1;
	}

	&__dot {
		display:       inline-block;
		width:         7px;
		height:        7px;
		margin-right:  4px;
		background:    var(--crm-green);
		border-radius: 50%;
	}

	&__operator {
		display:     flex;
		gap:         8px;
		align-items: center;
		font-size:   13px;
		color:       #dbe2ee;
	}
}
</style>
