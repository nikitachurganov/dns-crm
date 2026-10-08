<script setup lang="ts">
import {computed} from 'vue';
import {Status} from '@dns-modules/status';

import '@dns-modules/status/style.css';

/**
 * Статус заказа на цветном Status из дизайн-системы
 */

const props = defineProps<{status: string}>();

const MAP: Record<string, ['red' | 'green' | 'blue' | 'orange' | 'gray', string]> = {
	'проблема':           ['red', 'проблема, обсуждаем'],
	'получен':            ['green', 'получен'],
	'доставлен':          ['green', 'доставлен'],
	'в пути':             ['blue', 'в пути'],
	'частично доставлен': ['blue', 'частично доставлен'],
	'ожидает оплаты':     ['orange', 'ожидает оплаты'],
	'в постамате':        ['gray', 'в постамате'],
	'возврат оформлен':   ['gray', 'возврат оформлен'],
	'обмен оформлен':     ['gray', 'обмен оформлен'],
};

const view = computed(() => MAP[props.status] ?? ['gray', props.status]);
</script>

<template>
	<status :color="view[0]">{{ view[1] }}</status>
</template>
