<script setup lang="ts">
import {computed} from 'vue';
import {BaseOption, BaseSelect, useOpen} from '@dns-modules/select';

import '@dns-modules/select/style.css';

/**
 * Одиночный выбор из списка строк на BaseSelect из дизайн-системы
 */

let seq = 0;

const props = defineProps<{
	label: string;
	options: string[];
	modelValue: string;
}>();

const emit = defineEmits<{'update:modelValue': [value: string]}>();

const id = `form-select-${++seq}`;

const {isOpen, setOpen, onSelect} = useOpen('single');

const items = computed(() => props.options.map((title, i) => ({id: String(i), title})));

function pick(title: string) {
	onSelect();
	emit('update:modelValue', title);
}
</script>

<template>
	<base-select
		:id="id"
		:is-open="isOpen"
		:label="label"
		placeholder="Выберите"
		:value="modelValue"
		:options="items"
		:z-index="2000"
		@click:header="setOpen(true)"
		@close="setOpen(false)"
	>
		<template #default="{option}">
			<base-option @click="pick(option.title as string)">
				{{ option.title }}
			</base-option>
		</template>
	</base-select>
</template>
