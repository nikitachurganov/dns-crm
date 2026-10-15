<script setup lang="ts">
import {ref, watch} from 'vue';
import {BaseUiButton, VARIANT} from '@dns-modules/base-ui-button';
import {FlatMenuList, MenuItem} from '@dns-modules/menu';
import {Modal, SIZES} from '@dns-modules/modal';
import {SITE_TOPICS} from '../data/topics';
import {useCrmStore} from '../stores/crm';

import '@dns-modules/base-ui-button/style.css';
import '@dns-modules/menu/style.css';
import '@dns-modules/modal/style.css';

/**
 * Модальное окно смены темы обращения: фиксированный список категорий сайта.
 * Выбор запоминается внутри окна и применяется кнопкой «Сохранить».
 */

const store = useCrmStore();

const selected = ref('');

// При открытии отмечена текущая тема тикета (если она уже одна из категорий сайта)
watch(() => store.isTopicOpen, (isOpen) => {
	if (isOpen) {
		selected.value = store.ticket?.site_topic ?? '';
	}
}, {immediate: true});

function save() {
	store.setTopic(store.ticketId, selected.value);
	store.isTopicOpen = false;
}
</script>

<template>
	<modal v-if="store.isTopicOpen" has-cross :size="SIZES.sm" @close="store.isTopicOpen = false">
		<template #title>Тема обращения</template>

		<div class="topic modal-body">
			<flat-menu-list :has-padding="false" aria-label="Тема обращения">
				<menu-item
					v-for="topic in SITE_TOPICS"
					:key="topic"
					:has-arrow="false"
					:is-selected="topic === selected"
					@click="selected = topic"
				>
					<template #title>{{ topic }}</template>
				</menu-item>
			</flat-menu-list>
		</div>

		<template #footer="{close}">
			<div class="topic__footer">
				<base-ui-button :variant="VARIANT.secondary" @click="close()">Отмена</base-ui-button>
				<base-ui-button :disabled="!selected || selected === store.ticket?.site_topic" @click="save()">Сохранить</base-ui-button>
			</div>
		</template>
	</modal>
</template>

<style scoped lang="scss">
.topic {
	// Подвал с кнопками идёт следом — нижний отступ ему не нужен
	padding-bottom: 0;

	&__footer {
		display:         flex;
		gap:             10px;
		justify-content: flex-end;
	}
}
</style>
