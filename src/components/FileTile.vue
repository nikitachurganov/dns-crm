<script setup lang="ts">
import {computed} from 'vue';

/**
 * Плитка файла 80×80: превью для изображения, иначе имя файла.
 * Используется и в поле ввода сообщения (со слотом под кнопку удаления), и в ленте чата.
 */

const props = defineProps<{
	name: string;
	/** Ссылка на превью, если это изображение */
	previewUrl?: string;
	/** Изображение открывается по клику (в чате); в поле ввода плитка не кликабельна */
	isOpenable?: boolean;
}>();

const emit = defineEmits<{
	open: [];
}>();

/** Кликабельна только плитка с изображением */
const canOpen = computed(() => !!props.isOpenable && !!props.previewUrl);

function open() {
	if (canOpen.value) {
		emit('open');
	}
}
</script>

<template>
	<div
		class="tile"
		:class="{'tile--openable': canOpen}"
		:title="name"
		:role="canOpen ? 'button' : undefined"
		:tabindex="canOpen ? 0 : undefined"
		:aria-label="canOpen ? `Открыть изображение ${name}` : undefined"
		@click="open"
		@keydown.enter.self.prevent="open"
		@keydown.space.self.prevent="open"
	>
		<img v-if="previewUrl" class="tile__img" :src="previewUrl" :alt="name">
		<span v-else class="tile__file"><span class="tile__name">{{ name }}</span></span>
		<slot />
	</div>
</template>

<style scoped lang="scss">
.tile {
	position:      relative;
	flex:          none;
	width:         80px;
	height:        80px;
	border-radius: 8px;

	&--openable {
		cursor:     zoom-in;
		transition: opacity 0.2s;

		&:hover {
			opacity: 0.85;
		}

		&:focus-visible {
			outline:        1px solid var(--stroke-border-dark, #434242);
			outline-offset: 2px;
		}
	}

	&__img {
		width:         100%;
		height:        100%;
		object-fit:    cover;
		border-radius: 8px;
	}

	&__file {
		display:         flex;
		align-items:     center;
		justify-content: center;
		width:           100%;
		height:          100%;
		padding:         6px;
		overflow:        hidden;
		font-size:       14px;
		line-height:     1.3;
		color:           var(--text-secondary, #4e4e4e);
		text-align:      center;
		word-break:      break-word;
		background:      var(--background-secondary-surface, #fff);
		border:          1px solid var(--stroke-border, #d2d1d1);
		border-radius:   8px;
	}

	// Длинное имя обрезается многоточием после трёх строк, а не по краю плитки
	&__name {
		display:            -webkit-box;
		overflow:           hidden;
		-webkit-line-clamp: 3;
		line-clamp:         3;
		-webkit-box-orient: vertical;
	}
}
</style>
