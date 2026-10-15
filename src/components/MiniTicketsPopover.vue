<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {useCrmStore} from '../stores/crm';
import ClientTickets from './ClientTickets.vue';

/**
 * Всплывающее меню с тикетами человека для свёрнутой колонки: появляется справа от аватара.
 * Открывается кликом (закрепляется) или долгим наведением (уходит вместе с курсором)
 */

const props = defineProps<{
	/** Чат, тикеты которого показаны; пусто — меню закрыто */
	chatId: string | null;
	/** Верх и левый край меню в координатах окна */
	top: number;
	left: number;
}>();

const emit = defineEmits<{
	/** Тикет выбран: меню нужно закрыть */
	select: [];
	/** Курсор вошёл в меню или вышел из него */
	hover: [on: boolean];
}>();

const store = useCrmStore();

// Пока меню гаснет, chatId уже пуст: помним последний, чтобы содержимое не мигало
const shownId = ref<string | null>(props.chatId);

watch(() => props.chatId, (id) => {
	if (id) {
		shownId.value = id;
	}
});

const client = computed(() => {
	const chat = store.chatById(shownId.value);

	return chat ? store.clientOfChat(chat) : undefined;
});

/** Меню не должно уходить за нижний край окна: при нехватке места поднимаем его выше */
const style = computed(() => {
	const top = Math.max(8, Math.min(props.top, window.innerHeight - 240));

	return {top: `${top}px`, left: `${props.left}px`, maxHeight: `${window.innerHeight - top - 16}px`};
});
</script>

<template>
	<teleport to="body">
		<transition name="pop">
			<section
				v-if="chatId"
				class="mini-pop"
				:style="style"
				role="dialog"
				:aria-label="`Обращения: ${client?.name ?? ''}`"
				@mouseenter="emit('hover', true)"
				@mouseleave="emit('hover', false)"
			>
				<header class="mini-pop__head">
					<div class="mini-pop__name">{{ client?.name }}</div>
					<div class="mini-pop__id">ID {{ client?.client_id }}</div>
				</header>
				<div class="mini-pop__list">
					<client-tickets v-if="shownId" :chat-id="shownId" @select="emit('select')" />
				</div>
			</section>
		</transition>
	</teleport>
</template>

<style scoped lang="scss">
.mini-pop {
	position:       fixed;
	z-index:        100;
	display:        flex;
	flex-direction: column;
	width:          320px;
	overflow:       hidden;
	background:     var(--background-secondary, #fff);
	border-radius:  8px;
	box-shadow:     var(--effect-plate-floating, 0 3px 12px rgba(0, 0, 0, 0.15));

	&__head {
		padding:       12px 16px;
		border-bottom: 1px solid var(--stroke-border-light, #eee);
	}

	&__name {
		overflow:      hidden;
		font-size:     16px;
		font-weight:   700;
		line-height:   24px;
		text-overflow: ellipsis;
		white-space:   nowrap;
	}

	&__id {
		font-size:   14px;
		line-height: 20px;
		color:       var(--text-tertiary, #7d7c7c);
	}

	&__list {
		flex:       1;
		min-height: 0;
		padding:    8px;
		overflow-y: auto;
	}
}

.pop-enter-active,
.pop-leave-active {
	transition: opacity 0.15s ease, transform 0.15s ease;
}

.pop-enter-from,
.pop-leave-to {
	opacity:   0;
	transform: translateX(-6px);
}

@media (prefers-reduced-motion: reduce) {
	.pop-enter-active,
	.pop-leave-active {
		transition: none;
	}
}
</style>
