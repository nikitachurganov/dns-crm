<script setup lang="ts">
import ActionModal from './components/ActionModal.vue';
import AppTopbar from './components/AppTopbar.vue';
import ChatQueue from './components/ChatQueue.vue';
import Client360Modal from './components/Client360Modal.vue';
import ClientPanel from './components/ClientPanel.vue';
import CsvModal from './components/CsvModal.vue';
import DialogPanel from './components/DialogPanel.vue';
import ToastHost from './components/ToastHost.vue';
</script>

<template>
	<div class="app">
		<app-topbar />
		<main class="app__main">
			<chat-queue />
			<dialog-panel />
			<client-panel />
		</main>

		<action-modal />
		<client360-modal />
		<csv-modal />
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
	}
}
</style>
