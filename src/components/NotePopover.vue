<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, ref, watch} from 'vue';
import {BaseUiButton, BaseUiIconButton, SIZE, VARIANT} from '@dns-modules/base-ui-button';
import {IconActionClose, IconNavChevronDown} from '@dns-modules/font-icon-v3';
import {useCrmStore} from '../stores/crm';
import {renderMarkdown} from '../utils/markdown';

import '@dns-modules/base-ui-button/style.css';

/**
 * Заметка к тикету — небольшая карточка над полем ввода: заголовок, крестик, текст в Markdown и кнопки внизу.
 * Карточка встаёт на место тега заметки: жёлтая кнопка «Скрыть заметку» оказывается ровно там, где был тег.
 * Заметку видят только сотрудники, клиенту она не уходит.
 */

/** Внутренний отступ карточки: на столько она выступает за тег, чтобы кнопка «Скрыть заметку» совпала с ним. Равен padding в стилях */
const PADDING = 16;

const store = useCrmStore();

const rootRef     = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const text        = ref('');
const isEditing   = ref(false);
const position    = ref({right: 8, bottom: 8});

const html = computed(() => renderMarkdown(store.noteOf(store.ticketId)));

function close() {
	store.isNoteOpen = false;
}

/** Карточка накрывает тег заметки: правый нижний угол кнопки «Скрыть заметку» совпадает с его углом */
function place() {
	const rect = document.querySelector('.note-tag')?.getBoundingClientRect();

	if (rect) {
		position.value = {right: window.innerWidth - rect.right - PADDING, bottom: window.innerHeight - rect.bottom - PADDING};
	}
}

async function startEdit() {
	text.value      = store.noteOf(store.ticketId);
	isEditing.value = true;

	await nextTick();
	textareaRef.value?.focus();
}

function save() {
	store.setNote(store.ticketId, text.value);

	// Пустая заметка удаляется — показывать нечего, закрываем; иначе возвращаемся к чтению
	if (store.noteOf(store.ticketId)) {
		isEditing.value = false;
	} else {
		close();
	}
}

/** Отмена правки: к чтению, если заметка уже есть, иначе закрываем */
function cancel() {
	if (store.noteOf(store.ticketId)) {
		isEditing.value = false;
	} else {
		close();
	}
}

function onPointerDown(e: PointerEvent) {
	const target = e.target as HTMLElement;

	// Клик по тегу заметки переключает карточку сам, поэтому здесь её не закрываем
	if (!rootRef.value?.contains(target) && !target.closest('.note-tag')) {
		close();
	}
}

function onKeydown(e: KeyboardEvent) {
	if ('Escape' === e.key) {
		close();
	}
}

function unlisten() {
	document.removeEventListener('pointerdown', onPointerDown);
	document.removeEventListener('keydown', onKeydown);
}

watch(() => store.isNoteOpen, async (isOpen) => {
	unlisten();

	if (!isOpen) {
		return;
	}

	place();
	document.addEventListener('pointerdown', onPointerDown);
	document.addEventListener('keydown', onKeydown);

	// Заметки ещё нет — сразу поле ввода; есть — читаем, править можно кнопкой
	if (store.noteOf(store.ticketId)) {
		isEditing.value = false;
	} else {
		await startEdit();
	}
}, {immediate: true});

onBeforeUnmount(unlisten);
</script>

<template>
	<transition name="note">
		<section
			v-if="store.isNoteOpen"
			ref="rootRef"
			class="note"
			role="dialog"
			aria-label="Заметка"
			:style="{right: `${position.right}px`, bottom: `${position.bottom}px`}"
		>
			<header class="note__head">
				<h2 class="note__title">Заметка</h2>
				<base-ui-icon-button
					:variant="VARIANT.tertiary"
					:size="SIZE.tiny"
					title="Закрыть"
					aria-label="Закрыть заметку"
					@click="close()"
				>
					<icon-action-close />
				</base-ui-icon-button>
			</header>

			<textarea
				v-if="isEditing"
				ref="textareaRef"
				v-model="text"
				class="note__text"
				placeholder="Заметка в формате Markdown: **жирный**, *курсив*, - список, # заголовок"
				aria-label="Заметка к обращению, видна только сотрудникам"
				@keydown.ctrl.enter="save()"
				@keydown.meta.enter="save()"
			/>
			<!-- HTML собран из экранированного текста, см. renderMarkdown -->
			<div v-else class="note__md" v-html="html" />

			<footer class="note__foot">
				<div class="note__actions">
					<template v-if="isEditing">
						<base-ui-button :size="SIZE.small" @click="save()">Сохранить</base-ui-button>
						<base-ui-button :variant="VARIANT.secondary" :size="SIZE.small" @click="cancel()">Отмена</base-ui-button>
					</template>
					<base-ui-button v-else :variant="VARIANT.secondary" :size="SIZE.small" @click="startEdit()">Редактировать</base-ui-button>
				</div>

				<!-- Жёлтая кнопка в цвете тега заметки: сворачивает карточку обратно в тег -->
				<button type="button" class="note__hide" @click="close()">
					<icon-nav-chevron-down class="note__hide-icon" />
					Скрыть заметку
				</button>
			</footer>
		</section>
	</transition>
</template>

<style scoped lang="scss">
.note {
	position:       fixed;
	z-index:        90;
	display:        flex;
	flex-direction: column;
	gap:            12px;
	box-sizing:     border-box;
	width:          344px;
	max-width:      calc(100vw - 32px);
	max-height:     min(480px, calc(100vh - 160px));
	padding:        16px;
	background:     var(--background-secondary, #fff);
	border-radius:  16px;
	box-shadow:     var(--effect-plate-floating, 0 3px 12px rgba(0, 0, 0, 0.15));

	&__head {
		display:         flex;
		flex:            none;
		gap:             12px;
		align-items:     center;
		justify-content: space-between;
		min-height:      32px;
	}

	&__title {
		margin:      0;
		font-size:   20px;
		font-weight: 700;
		line-height: 28px;
	}

	&__text {
		display:       block;
		box-sizing:    border-box;
		flex:          1;
		width:         100%;
		min-height:    144px;
		padding:       12px;
		font:          inherit;
		font-size:     16px;
		line-height:   1.45;
		color:         var(--text-primary, #333);
		resize:        vertical;
		background:    var(--background-primary-surface, #f7f7f7);
		border:        1px solid transparent;
		border-radius: 12px;
		outline:       none;
		transition:    background-color 0.2s, border-color 0.2s;

		&::placeholder {
			color: var(--text-tertiary, #7d7c7c);
		}

		&:focus {
			background:   var(--background-secondary-surface, #fff);
			border-color: var(--stroke-border-dark, #434242);
		}
	}

	// Заметка в Markdown: небольшие заголовки, списки, цитаты и код
	&__md {
		flex:          1;
		min-height:    0;
		overflow-y:    auto;
		font-size:     16px;
		line-height:   1.45;
		color:         var(--text-secondary, #4e4e4e);
		overflow-wrap: anywhere;

		:deep(> :first-child) {
			margin-top: 0;
		}

		:deep(> :last-child) {
			margin-bottom: 0;
		}

		:deep(p),
		:deep(ul),
		:deep(ol),
		:deep(blockquote),
		:deep(pre) {
			margin: 0 0 8px;
		}

		:deep(h3),
		:deep(h4),
		:deep(h5) {
			margin:      12px 0 4px;
			font-size:   16px;
			font-weight: 700;
			line-height: 24px;
			color:       var(--text-primary, #333);
		}

		:deep(h5) {
			font-size: 14px;
		}

		:deep(ul),
		:deep(ol) {
			padding-left: 20px;
		}

		:deep(blockquote) {
			padding-left: 12px;
			border-left:  3px solid var(--stroke-border, #d2d1d1);
		}

		:deep(code) {
			padding:       0 4px;
			font-size:     14px;
			background:    var(--background-primary, #f7f7f7);
			border-radius: 4px;
		}

		:deep(pre) {
			padding:       8px 12px;
			overflow-x:    auto;
			background:    var(--background-primary, #f7f7f7);
			border-radius: 8px;

			code {
				padding: 0;
			}
		}

		:deep(a) {
			color: var(--text-link, #007de3);
		}

		:deep(hr) {
			margin:     12px 0;
			border:     none;
			border-top: 1px solid var(--stroke-border-light, #eee);
		}
	}

	&__foot {
		display:         flex;
		flex:            none;
		gap:             12px;
		align-items:     center;
		justify-content: space-between;
	}

	&__actions {
		display: flex;
		gap:     8px;
	}

	// Кнопка в цвете тега заметки (жёлтая заливка, янтарный текст и значок)
	&__hide {
		display:       inline-flex;
		gap:           6px;
		align-items:   center;
		// Высота как у кнопок слева (SIZE.small), чтобы ряд был ровным и кнопка целиком закрывала тег под собой
		min-height:    36px;
		padding:       0 16px 0 12px;
		font:          inherit;
		font-size:     14px;
		font-weight:   500;
		color:         #cd7f00;
		cursor:        pointer;
		background:    var(--background-warning-light, #fff7da);
		border:        1px solid var(--background-warning-main, #ffca48);
		border-radius: 18px;
		transition:    border-color 0.15s;

		&:hover {
			border-color: var(--background-warning-dark, #d09e04);
		}

		&:focus-visible {
			outline:        1px solid var(--stroke-border-dark, #434242);
			outline-offset: 2px;
		}
	}

	&__hide-icon {
		flex:      none;
		font-size: 16px;
	}
}

.note-enter-active,
.note-leave-active {
	transition: opacity 0.15s ease, transform 0.15s ease;
}

.note-enter-from,
.note-leave-to {
	opacity:   0;
	transform: translateY(6px);
}

@media (prefers-reduced-motion: reduce) {
	.note-enter-active,
	.note-leave-active {
		transition: none;
	}
}
</style>
