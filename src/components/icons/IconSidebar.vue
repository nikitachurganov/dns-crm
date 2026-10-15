<script setup lang="ts">
/**
 * Иконка сайдбара: рамка с вертикальной полосой слева.
 * В шрифте иконок ДС такой иконки нет, поэтому нарисована отдельно; цвет берётся из currentColor
 */
</script>

<template>
	<svg
		class="icon-sidebar"
		width="18"
		height="18"
		viewBox="0 0 18 18"
		fill="none"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<rect x="2" y="3" width="14" height="12" rx="2.5" />
		<path d="M7 3v12" />
	</svg>
</template>

<style scoped lang="scss">
.icon-sidebar {
	display: block;
}
</style>
