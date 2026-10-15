<script setup lang="ts">
import {Modal, SIZES} from '@dns-modules/modal';

import '@dns-modules/modal/style.css';

/**
 * Просмотр изображения из чата: модальное окно с именем файла в заголовке.
 * Закрывается крестиком, по Esc и по клику на фон
 */

defineProps<{
	src: string;
	name: string;
}>();

defineEmits<{
	close: [];
}>();
</script>

<template>
	<modal has-cross is-backdrop-closable :size="SIZES.lg" @close="$emit('close')">
		<template #title>{{ name }}</template>

		<div class="viewer">
			<img class="viewer__img" :src="src" :alt="name">
		</div>
	</modal>
</template>

<style scoped lang="scss">
.viewer {
	display:         flex;
	align-items:     center;
	justify-content: center;
	padding:         16px 24px 24px;

	&__img {
		display:       block;
		max-width:     100%;
		max-height:    70vh;
		object-fit:    contain;
		border-radius: 8px;
	}
}
</style>
