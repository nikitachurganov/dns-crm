<script setup lang="ts">
/**
 * Меню чатов. Логика и состояния повторяют FlatMenuList из @dns-modules/menu,
 * раскладка пунктов своя — под строку чата
 */

defineProps<{
	/** Подпись для скринридеров */
	label?: string;
}>();
</script>

<template>
	<ul class="chat-menu" :aria-label="label">
		<slot />
	</ul>
</template>

<style scoped lang="scss">
.chat-menu {
	display:        flex;
	flex-direction: column;
	gap:            4px;
	padding:        0;
	margin:         0;
	list-style:     none;
}
</style>
