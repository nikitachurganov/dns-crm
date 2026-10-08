<script setup lang="ts">
import {BaseSnackbar} from '@dns-modules/snackbar';
import {useCrmStore} from '../stores/crm';

import '@dns-modules/snackbar/style.css';

/**
 * Стек уведомлений на снекбарах дизайн-системы
 */

const store = useCrmStore();
</script>

<template>
	<div class="toasts">
		<base-snackbar
			v-for="toast in store.toasts"
			:key="toast.id"
			:class="['toast', `toast--${toast.type}`]"
			@close="store.dismissToast(toast.id)"
		>
			{{ toast.text }}
		</base-snackbar>
	</div>
</template>

<style scoped lang="scss">
.toasts {
	position:       fixed;
	right:          20px;
	bottom:         20px;
	z-index:        1000;
	display:        flex;
	flex-direction: column;
	gap:            8px;
	max-width:      360px;
}

.toast {
	position: static;
}
</style>
