<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {BaseUiIconButton, SIZE, VARIANT} from '@dns-modules/base-ui-button';
import {IconActionAttach, IconActionClose, IconActionSendMessage, IconDataHappyFace} from '@dns-modules/font-icon-v3';
import {FloatingMenuList, POSITIONS} from '@dns-modules/menu';
import {Scrollbar} from '@dns-modules/scrollbar';
import FileTile from '../FileTile.vue';
import {DEFAULT_FREQUENT, EMOJI_CATEGORIES, searchEmoji} from '../../data/emoji';

import '@dns-modules/base-ui-button/style.css';
import '@dns-modules/menu/style.css';
import '@dns-modules/scrollbar/style.css';

/**
 * Поле ввода сообщения по макету «Message input» (UFO DNSUI Web Library).
 * Пустое и без фокуса — одна строка с плейсхолдером; в фокусе или с содержимым разворачивается:
 * текст, превью вложений, кнопки «прикрепить» и «отправить», текст ошибки.
 */

/** Вложение в поле ввода */
export interface MessageInputAttachment {
	id: string;
	name: string;
	/** Ссылка на превью, если это изображение */
	previewUrl?: string;
	isVideo?: boolean;
}

const props = withDefaults(defineProps<{
	modelValue: string;
	placeholder?: string;
	color?: 'gray' | 'white';
	attachments?: MessageInputAttachment[];
	/** Текст ошибки под вложениями, например при превышении лимита файлов */
	error?: string;
	isDisabled?: boolean;
	/** Максимальная высота текста, дальше — прокрутка */
	maxTextHeight?: number;
}>(), {
	placeholder:   'Оставьте комментарий',
	color:         'gray',
	attachments:   () => [],
	error:         '',
	isDisabled:    false,
	maxTextHeight: 112,
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
	send: [];
	attach: [];
	remove: [id: string];
}>();

const rootRef     = ref<HTMLElement | null>(null);
const buttonsRef  = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const contentRef  = ref<HTMLElement | null>(null);
const isFocused   = ref(false);

/** Высота содержимого: рамка поля анимирует её, чтобы разворачивание и рост текста шли плавно */
const contentHeight = ref<number | null>(null);
/** Анимацию включаем после первого замера, иначе поле «выезжает» из нуля при загрузке */
const isAnimated    = ref(false);
let observer: ResizeObserver | null = null;

onMounted(() => {
	observer = new ResizeObserver(([entry]) => {
		if (entry) {
			contentHeight.value = entry.borderBoxSize[0]?.blockSize ?? entry.target.getBoundingClientRect().height;
		}
	});
	if (contentRef.value) {
		observer.observe(contentRef.value);
	}
	requestAnimationFrame(() => {
		isAnimated.value = true;
	});
});

onBeforeUnmount(() => observer?.disconnect());

const isFilled   = computed(() => !!props.modelValue.trim() || !!props.attachments.length);
/** Развёрнуто: в фокусе или есть текст/вложения — кнопки уходят под поле ввода */
const isExpanded = computed(() => !props.isDisabled && (isFocused.value || isFilled.value));
const canSend    = computed(() => !props.isDisabled && isFilled.value);

/** Высота textarea по содержимому; прокрутку при превышении берёт на себя Scrollbar */
function resize() {
	const el = textareaRef.value;

	if (el) {
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight}px`;
	}
}

watch(() => props.modelValue, () => nextTick(resize));

/**
 * Кнопки при разворачивании поля переезжают из строки справа под текст.
 * Запоминаем положение до перестройки и после неё плавно «довозим» кнопки из старой позиции в новую (FLIP).
 */
watch(isExpanded, async () => {
	const el = buttonsRef.value;

	if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		return;
	}

	// Сам контейнер при разворачивании растягивается на всю ширину, поэтому ориентируемся на первую кнопку
	const marker = () => (el.firstElementChild ?? el).getBoundingClientRect();
	const first  = marker();

	await nextTick();

	const last = marker();
	const dx   = first.left - last.left;
	const dy   = first.top - last.top;

	if (dx || dy) {
		el.animate(
			[{transform: `translate(${dx}px, ${dy}px)`}, {transform: 'translate(0, 0)'}],
			{duration: 200, easing: 'ease-out'},
		);
	}
}, {flush: 'pre'});

function onInput(event: Event) {
	emit('update:modelValue', (event.target as HTMLTextAreaElement).value);
	resize();
}

function onEnter(event: KeyboardEvent) {
	event.preventDefault();
	send();
}

function send() {
	if (canSend.value) {
		emit('send');
	}
}

// Поле разворачивается только от фокуса в самом поле ввода. Клик по кнопкам (скрепка, эмодзи, отправка)
// высоту не меняет: из свёрнутого состояния они его не разворачивают, из развёрнутого — не сворачивают.
function onFocusIn(event: FocusEvent) {
	if (event.target === textareaRef.value) {
		isFocused.value = true;
	}
}

function onFocusOut(event: FocusEvent) {
	const next = event.relatedTarget as Node | null;

	// Фокус ушёл в кнопку внутри поля или в открытую панель эмодзи — состояние не трогаем
	if (rootRef.value?.contains(next) || isEmojiOpen.value) {
		return;
	}

	isFocused.value = false;
}

/** Закрытие панели эмодзи без выбора: если фокус остался вне поля, сворачиваем как при обычной потере фокуса */
function closeEmoji() {
	isEmojiOpen.value = false;

	nextTick(() => {
		if (!rootRef.value?.contains(document.activeElement)) {
			isFocused.value = false;
		}
	});
}

function focus() {
	textareaRef.value?.focus();
}

const emojiRef    = ref<InstanceType<typeof BaseUiIconButton> | null>(null);
const isEmojiOpen = ref(false);
const emojiQuery  = ref('');

const FREQUENT_KEY   = 'crm.emoji.usage';
const FREQUENT_COUNT = 6;

/** Сколько раз использовали каждый эмодзи; хранится в браузере */
const usage = ref<Record<string, number>>(loadUsage());

function loadUsage(): Record<string, number> {
	try {
		return JSON.parse(localStorage.getItem(FREQUENT_KEY) ?? '{}') || {};
	} catch {
		return {};
	}
}

/** Шесть самых частых; недостающие добираем эмодзи по умолчанию */
const frequent = computed(() => {
	const used = Object.entries(usage.value).sort((a, b) => b[1] - a[1]).map(([char]) => char);

	return [...new Set([...used, ...DEFAULT_FREQUENT])].slice(0, FREQUENT_COUNT);
});

const foundEmoji = computed(() => searchEmoji(emojiQuery.value));
const isSearch   = computed(() => !!emojiQuery.value.trim());

function toggleEmoji() {
	isEmojiOpen.value = !isEmojiOpen.value;
	emojiQuery.value  = '';
}

/** Фокус в поиск при открытии панели */
const vFocus = {mounted: (el: HTMLElement) => requestAnimationFrame(() => el.focus())};

/** Вставка эмодзи в позицию курсора */
function insertEmoji(emoji: string) {
	const el    = textareaRef.value;
	const value = props.modelValue;
	const start = el?.selectionStart ?? value.length;
	const end   = el?.selectionEnd ?? start;

	usage.value = {...usage.value, [emoji]: (usage.value[emoji] ?? 0) + 1};
	try {
		localStorage.setItem(FREQUENT_KEY, JSON.stringify(usage.value));
	} catch { /* хранилище недоступно — статистика живёт до перезагрузки */ }

	emit('update:modelValue', value.slice(0, start) + emoji + value.slice(end));
	isEmojiOpen.value = false;

	nextTick(() => {
		focus();
		el?.setSelectionRange(start + emoji.length, start + emoji.length);
		resize();
	});
}

defineExpose({focus});
</script>

<template>
	<div
		ref="rootRef"
		class="mi"
		:class="[
			`mi--${color}`,
			{
				'mi--expanded': isExpanded,
				'mi--active':   isFocused,
				'mi--disabled': isDisabled,
				'mi--animated': isAnimated,
			},
		]"
		:style="null === contentHeight ? undefined : {height: `${contentHeight}px`}"
		@focusin="onFocusIn"
		@focusout="onFocusOut"
		@click.self="focus"
	>
		<div ref="contentRef" class="mi__content" @click.self="focus">
			<div class="mi__row">
				<scrollbar class="mi__scroll" is-compact :style="{maxHeight: `${maxTextHeight}px`}">
					<textarea
						ref="textareaRef"
						class="mi__text"
						rows="1"
						:value="modelValue"
						:placeholder="placeholder"
						:disabled="isDisabled"
						:aria-label="placeholder"
						@input="onInput"
						@keydown.enter.exact="onEnter"
					/>
				</scrollbar>

				<!-- Кнопки всегда на виду: скрепка, эмодзи, отправка -->
				<div ref="buttonsRef" class="mi__buttons">
					<base-ui-icon-button
						:variant="VARIANT.secondary"
						:size="SIZE.tiny"
						:disabled="isDisabled"
						title="Прикрепить файл"
						aria-label="Прикрепить файл"
						@click="emit('attach')"
					>
						<icon-action-attach />
					</base-ui-icon-button>
					<base-ui-icon-button
						ref="emojiRef"
						class="mi__emoji-btn"
						:class="{'mi__emoji-btn--pressed': isEmojiOpen}"
						:variant="VARIANT.secondary"
						:size="SIZE.tiny"
						:disabled="isDisabled"
						title="Эмодзи"
						aria-label="Эмодзи"
						:aria-expanded="isEmojiOpen"
						@click="toggleEmoji"
					>
						<icon-data-happy-face />
					</base-ui-icon-button>
					<base-ui-icon-button
						:size="SIZE.tiny"
						:disabled="!canSend"
						title="Отправить"
						aria-label="Отправить"
						@click="send"
					>
						<icon-action-send-message />
					</base-ui-icon-button>
				</div>
			</div>

			<div v-if="attachments.length" class="mi__media">
				<file-tile v-for="item in attachments" :key="item.id" :name="item.name" :preview-url="item.previewUrl">
					<button type="button" class="media__delete" :aria-label="`Удалить ${item.name}`" @click="emit('remove', item.id)">
						<icon-action-close />
					</button>
				</file-tile>
			</div>

			<p v-if="error" class="mi__error">{{ error }}</p>
		</div>

		<!-- Панель эмодзи вне блока contentRef: её служебный элемент не должен менять измеряемую высоту поля -->
		<floating-menu-list
			v-if="isEmojiOpen"
			:reference="(emojiRef?.$el as HTMLElement | undefined) ?? null"
			:position="POSITIONS.topEnd"
			class="emoji-menu"
			@close="closeEmoji"
		>
			<div class="emoji">
				<input
					v-model="emojiQuery"
					v-focus
					type="search"
					class="emoji__search"
					placeholder="Поиск эмодзи"
					aria-label="Поиск эмодзи"
				>

				<div class="emoji__body">
					<template v-if="isSearch">
						<div v-if="foundEmoji.length" class="emoji__grid">
							<button v-for="e in foundEmoji" :key="e.char" type="button" class="emoji__item" @click="insertEmoji(e.char)">{{ e.char }}</button>
						</div>
						<p v-else class="emoji__empty">Ничего не найдено</p>
					</template>

					<template v-else>
						<section>
							<h4 class="emoji__title">Часто используемые</h4>
							<div class="emoji__grid">
								<button v-for="e in frequent" :key="e" type="button" class="emoji__item" @click="insertEmoji(e)">{{ e }}</button>
							</div>
						</section>
						<section v-for="category in EMOJI_CATEGORIES" :key="category.id">
							<h4 class="emoji__title">{{ category.title }}</h4>
							<div class="emoji__grid">
								<button v-for="e in category.items" :key="e.char" type="button" class="emoji__item" @click="insertEmoji(e.char)">{{ e.char }}</button>
							</div>
						</section>
					</template>
				</div>
			</div>
		</floating-menu-list>
	</div>
</template>

<style scoped lang="scss">
.mi {
	box-sizing:    content-box;
	overflow:      hidden;
	cursor:        text;
	border:        1px solid transparent;
	border-radius: 12px;
	transition:    background-color 0.2s, border-color 0.2s;

	&--animated {
		transition: background-color 0.2s, border-color 0.2s, height 0.2s ease-out;
	}

	&__content {
		display:        flex;
		flex-direction: column;
		gap:            12px;
		padding:        12px;
	}

	&--gray {
		background-color: var(--background-primary-surface, #f7f7f7);
	}

	&--white {
		background-color: var(--background-secondary-surface, #fff);
		border-color:     var(--stroke-border, #d2d1d1);
	}

	&:hover:not(&--active):not(&--disabled) {
		background-color: var(--background-neutral-light, #eee);
	}

	&--white:hover:not(&--active):not(&--disabled) {
		border-color: var(--stroke-border-hover, #a7a5a5);
	}

	&--active {
		background-color: var(--background-secondary-surface, #fff);
		border-color:     var(--stroke-border-dark, #434242);
	}

	&--disabled {
		cursor:  default;
		opacity: 0.6;
	}

	&__row {
		display:     flex;
		gap:         8px;
		align-items: flex-end;
	}

	// Одна строка текста по высоте равна кнопкам 32px
	&__scroll {
		flex:       1;
		min-width:  0;
		min-height: 32px;
		padding:    5px 0;
	}

	&__buttons {
		display: flex;
		flex:    none;
		gap:     8px;
	}

	// Развёрнутое поле: текст сверху, кнопки отдельной строкой снизу справа
	&--expanded &__row {
		flex-direction: column;
		align-items:    stretch;
		gap:            12px;
	}

	&--expanded &__scroll {
		min-height: 22px;
		padding:    0;
	}

	&--expanded &__buttons {
		justify-content: flex-end;
	}

	&__text {
		display:     block;
		width:       100%;
		padding:     0;
		margin:      0;
		overflow:    hidden;
		font:        inherit;
		font-size:   16px;
		line-height: 1.4;
		color:       var(--text-primary, #333);
		resize:      none;
		background:  transparent;
		border:      none;
		outline:     none;

		&::placeholder {
			color: var(--text-tertiary, #7d7c7c);
		}
	}

	&__media {
		display:   flex;
		flex-wrap: wrap;
		gap:       12px;
		cursor:    default;
	}


	&__error {
		flex:        1;
		margin:      0;
		font-size:   16px;
		line-height: 1.3;
		color:       var(--text-error, #ff544b);
	}


}

// Плитка файла — общий компонент FileTile; здесь только кнопка удаления поверх неё
.media {
	&__delete {
		position:        absolute;
		top:             -6px;
		right:           -6px;
		display:         flex;
		align-items:     center;
		justify-content: center;
		padding:         4px;
		font-size:       16px;
		line-height:     16px;
		color:           var(--icon-primary-inverse, #fff);
		cursor:          pointer;
		background:      var(--background-neutral-dark, #919090);
		border:          none;
		border-radius:   16px;

		&:focus-visible {
			outline: 1px solid var(--stroke-border-dark, #434242);
		}
	}
}

@media (prefers-reduced-motion: reduce) {
	.mi--animated {
		transition: background-color 0.2s, border-color 0.2s;
	}
}

// Кнопка эмодзи, пока панель открыта, выглядит нажатой (как :active/:focus у secondary-кнопки)
.mi__emoji-btn.mi__emoji-btn--pressed {
	--button-border-color: var(--stroke-border, #d2d1d1);

	outline:    3px solid var(--transparency-dark-dark-6, rgba(0, 0, 0, 0.06));
	box-shadow: none;
}

.emoji {
	display:        flex;
	flex-direction: column;
	gap:            8px;
	width:          360px;
	padding:        0 12px;

	&__search {
		box-sizing:    border-box;
		width:         100%;
		height:        36px;
		padding:       0 12px;
		font:          inherit;
		font-size:     14px;
		color:         var(--text-primary, #333);
		background:    var(--background-primary-surface, #f7f7f7);
		border:        1px solid transparent;
		border-radius: 8px;
		outline:       none;

		&:focus {
			background:   var(--background-secondary-surface, #fff);
			border-color: var(--stroke-border-dark, #434242);
		}
	}

	&__body {
		display:        flex;
		flex-direction: column;
		gap:            8px;
		max-height:     280px;
		overflow-y:     auto;
	}

	&__title {
		margin:      0 0 4px 4px;
		font-size:   12px;
		font-weight: 500;
		line-height: 16px;
		color:       var(--text-tertiary, #7d7c7c);
	}

	&__empty {
		margin:     16px 0;
		font-size:  14px;
		color:      var(--text-tertiary, #7d7c7c);
		text-align: center;
	}

	&__grid {
		display:               grid;
		grid-template-columns: repeat(8, minmax(0, 1fr));
		gap:                   4px;
	}

	&__item {
		width:         100%;
		height:        36px;
		font-size:     20px;
		line-height:   1;
		cursor:        pointer;
		background:    transparent;
		border:        none;
		border-radius: 8px;

		&:hover {
			background: var(--background-neutral-light, #eee);
		}

		&:focus-visible {
			outline: 1px solid var(--stroke-border-dark, #434242);
		}
	}
}
</style>

<style lang="scss">
// Панель выносится в body и по умолчанию оказывается под тегом «Добавить заметку»
.emoji-menu {
	z-index: 100;
}
</style>
