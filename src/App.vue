<script setup lang="ts">
import {onBeforeUnmount, onMounted} from 'vue';
import ActionModal from './components/ActionModal.vue';
import AppTopbar from './components/AppTopbar.vue';
import ChatQueue from './components/ChatQueue.vue';
import Client360Modal from './components/Client360Modal.vue';
import ClientPanel from './components/ClientPanel.vue';
import CsvModal from './components/CsvModal.vue';
import DialogPanel from './components/DialogPanel.vue';
import NotePopover from './components/NotePopover.vue';
import ToastHost from './components/ToastHost.vue';
import TopicModal from './components/TopicModal.vue';
import {useCrmStore} from './stores/crm';

const store = useCrmStore();

/** Esc сворачивает открытый чат, если Esc не нужен более верхнему слою: окну, меню, поповеру или просмотру изображения */
function onEsc(e: KeyboardEvent) {
	if ('Escape' !== e.key || e.defaultPrevented || !store.chat) {
		return;
	}

	const hasOverlay = store.actionType || store.client360Id || store.isCsvOpen || store.isNoteOpen || store.isTopicOpen
		|| document.querySelector('[role="dialog"], [role="menu"], [role="listbox"], [aria-modal="true"]');

	if (!hasOverlay) {
		store.closeChat();
	}
}

onMounted(() => window.addEventListener('keydown', onEsc));
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc));
</script>

<template>
	<div class="app">
		<app-topbar />
		<main class="app__main">
			<chat-queue />
			<dialog-panel />
			<transition name="details">
				<client-panel v-if="store.isDetailsOpen && store.chat" />
			</transition>
		</main>

		<action-modal />
		<client360-modal />
		<csv-modal />
		<note-popover />
		<topic-modal />
		<toast-host />
	</div>
</template>

<style scoped lang="scss">
.app {
	display:        flex;
	flex-direction: column;
	height:         100vh;

	&__main {
		display:    flex;
		flex:       1;
		min-height: 0;
		// Правая панель выезжает за правый край: лишнее обрезаем, чтобы не появлялась горизонтальная прокрутка
		overflow:   hidden;
	}
}

// Правая панель плавно выезжает справа и уезжает обратно. Ширина панели не меняется (содержимое не перестраивается):
// сдвигается её внешний отступ, поэтому чат плавно занимает освободившееся место
$details-width: 380px;

.details-enter-active,
.details-leave-active {
	transition: margin-right 0.22s ease, transform 0.22s ease, opacity 0.22s ease;
}

.details-enter-from,
.details-leave-to {
	margin-right: -$details-width;
	opacity:      0;
	transform:    translateX(40px);
}

@media (prefers-reduced-motion: reduce) {
	.details-enter-active,
	.details-leave-active {
		transition: none;
	}
}
</style>
