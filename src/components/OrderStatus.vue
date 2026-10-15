<script setup lang="ts">
import {computed} from 'vue';
import {Status} from '@dns-modules/status';

import '@dns-modules/status/style.css';

/**
 * Статус заказа на цветном Status из дизайн-системы
 */

const props = defineProps<{
	status: string;
	/** Статус с обводкой вместо заливки */
	hasOutline?: boolean;
}>();

const MAP: Record<string, ['red' | 'green' | 'blue' | 'orange' | 'gray', string]> = {
	'проблема':           ['red', 'проблема, обсуждаем'],
	'отменён':            ['red', 'отменён'],
	'получен':            ['green', 'получен'],
	'доставлен':          ['green', 'получен'],
	'в пути':             ['blue', 'в пути'],
	'частично доставлен': ['blue', 'частично доставлен'],
	'ожидает оплаты':     ['orange', 'ожидает оплаты'],
	'в постамате':        ['gray', 'в постамате'],
	'возврат оформлен':   ['gray', 'возврат оформлен'],
	'обмен оформлен':     ['gray', 'обмен оформлен'],
};

const view = computed(() => {
	const [color, label] = MAP[props.status] ?? ['gray', props.status];

	return [color, label.charAt(0).toUpperCase() + label.slice(1)] as const;
});
</script>

<template>
	<status :color="view[0]" :has-outline="hasOutline">{{ view[1] }}</status>
</template>
