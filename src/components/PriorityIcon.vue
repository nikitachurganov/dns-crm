<script setup lang="ts">
import {computed} from 'vue';
import {BaseUiTooltip} from '@dns-modules/base-ui-tooltip';

import '@dns-modules/base-ui-tooltip/style.css';

/**
 * Приоритет тикета: высокий — красный залитый огонёк, средний — такой же оранжевый (иконка data-fire, цвет задаётся через fill).
 * Низкий приоритет и его отсутствие не выводятся: иконка ничего не рисует.
 * При наведении показывается подсказка: название приоритета и, если задан hint, сколько обращение висит без ответа.
 */

const props = defineProps<{
	priority?: string;
	/** Вторая строка подсказки, например «Ждёт ответа 3 ч» */
	hint?: string;
}>();

const VIEW: Record<string, {label: string; color: string}> = {
	high:   {label: 'Высокий приоритет', color: '#ff544b'},
	medium: {label: 'Средний приоритет', color: '#cd7f00'},
};

const view = computed(() => VIEW[props.priority ?? '']);
</script>

<template>
	<base-ui-tooltip v-if="view" tag="span" class="priority-tip" position="bottom-end">
		<svg
			class="priority"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			:fill="view.color"
			role="img"
			:aria-label="hint ? `${view.label}. ${hint}` : view.label"
		>
			<path d="M13.75 2C13.75 1.7298 13.6046 1.48048 13.3695 1.34735C13.1344 1.21422 12.8458 1.21786 12.6141 1.35688C7.65364 4.33317 7.28314 9.9631 8.02186 14.0198C7.48722 13.7393 7.09958 13.2211 6.81036 12.5704C6.36429 11.5667 6.25001 10.427 6.25 9.99999C6.25 9.69664 6.06726 9.42317 5.78701 9.30709C5.50675 9.19101 5.18417 9.25517 4.96967 9.46967C4.4225 10.0168 3.97746 10.5994 3.67864 11.3465C3.38224 12.0875 3.25 12.9394 3.25 14C3.25 19.4743 7.64855 22.75 12 22.75C16.3514 22.75 20.75 19.4743 20.75 14C20.75 12.3793 20.4711 11.5286 20.0644 10.5796C20.0113 10.4558 19.9564 10.3309 19.9 10.2024C19.5517 9.40976 19.143 8.47965 18.7276 6.8181C18.6724 6.5974 18.5201 6.41367 18.3134 6.31861C18.1067 6.22356 17.868 6.22744 17.6646 6.32918C15.83 7.24646 15.3888 8.87344 15.283 10.2334C14.3668 9.47139 13.9263 8.25536 13.7438 6.84152C13.6265 5.93215 13.6251 4.99469 13.6557 4.1442C13.6679 3.80579 13.6866 3.46212 13.7041 3.13965C13.7281 2.69697 13.75 2.29425 13.75 2Z" />
		</svg>
		<template #content>
			<span class="priority-tip__label">{{ view.label }}</span>
			<span v-if="hint" class="priority-tip__hint">{{ hint }}</span>
		</template>
	</base-ui-tooltip>
</template>

<style scoped lang="scss">
.priority {
	display: block;
	flex:    none;
}

.priority-tip {
	display:     inline-flex;
	flex:        none;
	align-items: center;
}
</style>

<!-- Содержимое подсказки телепортируется в body, поэтому его стили не могут быть scoped -->
<style lang="scss">
.priority-tip__label,
.priority-tip__hint {
	display:     block;
	white-space: nowrap;
}

.priority-tip__label {
	font-weight: 700;
}
</style>
