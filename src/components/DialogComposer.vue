<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {BaseUiButton, BaseUiIconButton, SIZE, VARIANT} from '@dns-modules/base-ui-button';
import {BaseUiTooltip} from '@dns-modules/base-ui-tooltip';
import {IconNavHamburgerMenu} from '@dns-modules/font-icon-v3';
import {FloatingMenuList, MenuItem, POSITIONS} from '@dns-modules/menu';
import {useCrmStore} from '../stores/crm';
import {REPLY_TEMPLATES, type ReplyTemplate} from '../data/templates';
import {firstName} from '../utils/format';
import {checkKanc} from '../utils/kanc';
import MessageInput, {type MessageInputAttachment} from './message-input/MessageInput.vue';

import '@dns-modules/base-ui-button/style.css';
import '@dns-modules/base-ui-tooltip/style.css';
import '@dns-modules/menu/style.css';

/**
 * Композер: шаблонные ответы, канцелярит-детектор, поле ввода
 */

const store = useCrmStore();

const messageInput = ref<InstanceType<typeof MessageInput> | null>(null);

/** Зазор между тегами шаблонов, px: совпадает с gap в стилях */
const TAG_GAP = 8;

const smartRef     = ref<HTMLElement | null>(null);
const rulerRef     = ref<HTMLElement | null>(null);
const moreRef      = ref<InstanceType<typeof BaseUiIconButton> | null>(null);
const visibleCount = ref(REPLY_TEMPLATES.length);
const isMenuOpen   = ref(false);
let observer: ResizeObserver | null = null;

/** Шаблоны, которые поместились в строку, и те, что ушли в меню «⋯» */
const visibleTemplates = computed(() => REPLY_TEMPLATES.slice(0, visibleCount.value));
const hiddenTemplates  = computed(() => REPLY_TEMPLATES.slice(visibleCount.value));

/**
 * Считает, сколько тегов помещается в одну строку вместе с кнопкой меню
 *
 * Ширины берутся из невидимой линейки, где первой стоит кнопка меню, за ней все теги
 */
function updateVisible() {
	const row   = smartRef.value;
	const ruler = rulerRef.value;

	if (!row || !ruler) {
		return;
	}

	const width      = row.clientWidth;
	const sizes      = [...ruler.children].map((el) => Math.min((el as HTMLElement).offsetWidth, width));
	const moreWidth  = sizes.shift() ?? 0;
	const total      = sizes.reduce((sum, w) => sum + w, 0) + TAG_GAP * Math.max(sizes.length - 1, 0);

	if (total <= width) {
		visibleCount.value = sizes.length;
		isMenuOpen.value   = false;

		return;
	}

	let used  = moreWidth;
	let count = 0;

	for (const w of sizes) {
		if (used + TAG_GAP + w > width) {
			break;
		}

		used += TAG_GAP + w;
		count++;
	}

	visibleCount.value = count;
}

// Блок шаблонов скрывается у закрытого тикета: следим за ним, пока он в DOM
watch(smartRef, (el, prev) => {
	if (prev) {
		observer?.unobserve(prev);
	}

	if (el) {
		observer?.observe(el);
		updateVisible();
	}
}, {flush: 'post'});

onMounted(() => {
	observer = new ResizeObserver(updateVisible);

	if (smartRef.value) {
		observer.observe(smartRef.value);
	}

	// Ширины тегов зависят от шрифта — пересчитываем, когда он загрузится
	void document.fonts?.ready.then(updateVisible);
	updateVisible();
});

/** Текст шаблона для текущего клиента: {name} → имя */
function templateText(t: ReplyTemplate) {
	return t.text.replace('{name}', firstName(store.client?.name) || 'Здравствуйте');
}

/** Клик по шаблону подставляет его текст в поле ввода и возвращает туда фокус */
function applyTemplate(t: ReplyTemplate) {
	isMenuOpen.value = false;
	store.draft      = templateText(t);
	messageInput.value?.focus();
}

const kanc = computed(() => checkKanc(store.draft));

/** Живая альтернатива канцеляриту */
const alternative = computed(() => store.intent?.replies.warm ?? '');

const placeholder = computed(() => (store.isClosed
	? `Тикет закрыт клиентом · оценка ${store.ticket?.csat || '—'}/5`
	: 'Написать клиенту…'));

/** Максимум вложений в одном сообщении */
const MAX_FILES = 5;

const fileInput   = ref<HTMLInputElement | null>(null);
const attachments = ref<MessageInputAttachment[]>([]);
const fileError   = ref('');
let attachSeq     = 0;

function revoke(items: MessageInputAttachment[]) {
	for (const item of items) {
		if (item.previewUrl) {
			URL.revokeObjectURL(item.previewUrl);
		}
	}
}

function clearAttachments() {
	revoke(attachments.value);
	attachments.value = [];
	fileError.value   = '';
}

function onFiles(event: Event) {
	const input = event.target as HTMLInputElement;
	const files = [...(input.files ?? [])];
	const free  = MAX_FILES - attachments.value.length;

	fileError.value = files.length > free ? 'Достигнуто максимальное количество файлов' : '';

	for (const file of files.slice(0, Math.max(free, 0))) {
		attachments.value.push({
			id:         String(++attachSeq),
			name:       file.name,
			previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
			isVideo:    file.type.startsWith('video/'),
		});
	}

	input.value = '';
}

function onRemove(id: string) {
	const item = attachments.value.find((a) => a.id === id);

	if (item) {
		revoke([item]);
	}

	attachments.value = attachments.value.filter((a) => a.id !== id);
	fileError.value   = '';
}

function onSend() {
	store.send(attachments.value.map((a) => ({name: a.name, previewUrl: a.previewUrl})));

	// Ссылки на превью уже в сообщениях ленты: не отзываем их, иначе плитки в чате останутся без картинок
	attachments.value = [];
	fileError.value   = '';
}

// Вложения относятся к конкретному тикету: при переключении сбрасываем
watch(() => store.ticketId, clearAttachments);

onBeforeUnmount(() => {
	revoke(attachments.value);
	observer?.disconnect();
});
</script>

<template>
	<div class="composer">
		<div v-if="kanc.length && !store.isClosed" class="kanc">
			<b>А- Канцелярит-детектор:</b> {{ kanc.join(', ') }} — звучит как переписка с госорганом.
			<div class="kanc__fix">
				<span>Живая альтернатива: «{{ alternative }}»</span>
				<base-ui-button :size="SIZE.tiny" @click="store.draft = alternative">Заменить</base-ui-button>
			</div>
		</div>

		<div v-if="!store.isClosed" ref="smartRef" class="smart">
			<!-- Кнопка меню стоит перед шаблонами. Кнопка и меню в одной обёртке: открытое меню не добавляет элемент в ряд тегов -->
			<div v-if="hiddenTemplates.length" class="smart__more">
				<base-ui-icon-button
					ref="moreRef"
					:variant="VARIANT.secondary"
					:size="SIZE.small"
					title="Ещё шаблоны"
					aria-label="Ещё шаблоны"
					:aria-expanded="isMenuOpen"
					@click="isMenuOpen = !isMenuOpen"
				>
					<icon-nav-hamburger-menu />
				</base-ui-icon-button>
				<floating-menu-list
					v-if="isMenuOpen"
					:reference="moreRef?.$el ?? null"
					:position="POSITIONS.topStart"
					@close="isMenuOpen = false"
				>
					<menu-item v-for="t in hiddenTemplates" :key="t.id" :has-arrow="false" @click="applyTemplate(t)">
						<template #title>{{ t.title }}</template>
					</menu-item>
				</floating-menu-list>
			</div>

			<!-- Полный текст шаблона — подсказка из ДС -->
			<base-ui-tooltip v-for="t in visibleTemplates" :key="t.id" tag="span" class="smart__tip" position="top-start">
				<base-ui-button
					class="smart__item"
					:variant="VARIANT.secondary"
					:size="SIZE.small"
					@click="applyTemplate(t)"
				>
					{{ t.title }}
				</base-ui-button>
				<template #content>{{ templateText(t) }}</template>
			</base-ui-tooltip>

			<!-- Невидимая линейка: кнопка меню и все теги в одну строку, чтобы мерить ширину -->
			<div ref="rulerRef" class="smart__ruler" aria-hidden="true">
				<base-ui-icon-button :variant="VARIANT.secondary" :size="SIZE.small" tabindex="-1">
					<icon-nav-hamburger-menu />
				</base-ui-icon-button>
				<base-ui-button
					v-for="t in REPLY_TEMPLATES"
					:key="t.id"
					class="smart__item"
					:variant="VARIANT.secondary"
					:size="SIZE.small"
					tabindex="-1"
				>
					{{ t.title }}
				</base-ui-button>
			</div>
		</div>

		<message-input
			ref="messageInput"
			v-model="store.draft"
			:placeholder="placeholder"
			:attachments="attachments"
			:error="fileError"
			:is-disabled="store.isClosed"
			@attach="fileInput?.click()"
			@remove="onRemove"
			@send="onSend"
		/>
		<input ref="fileInput" type="file" multiple hidden @change="onFiles">
	</div>
</template>

<style scoped lang="scss">
.composer {
	flex:       none;
	padding:    16px;
	background: var(--crm-panel);
	border-top: 1px solid var(--crm-line);
}

.kanc {
	padding:       8px 12px;
	margin-bottom: 8px;
	font-size:     14px;
	color:         #7f1d1d;
	background:    var(--crm-red-bg);
	border:        1px solid #f6c8c8;
	border-radius: 10px;

	b {
		color: var(--crm-red);
	}

	&__fix {
		display:       flex;
		gap:           10px;
		align-items:   flex-start;
		padding:       7px 10px;
		margin-top:    6px;
		color:         #14532d;
		background:    var(--crm-panel);
		border:        1px solid #bfe8cc;
		border-radius: 8px;

		span {
			flex: 1;
		}
	}
}

.smart {
	// Шаблоны — серые теги с названием в одну строку; не поместившиеся уходят в меню «⋯». Клик подставляет текст в поле
	position:      relative;
	display:       flex;
	flex-wrap:     nowrap;
	gap:           8px;
	margin-bottom: 8px;

	&__more {
		display: flex;
		flex:    none;
	}

	// Кнопка меню — точный квадрат 36×36, шаблоны той же высоты: ряд ровный
	&__more :deep(button) {
		width:  36px;
		height: 36px;
	}

	// Линейка вне потока и невидима, но с теми же стилями тегов
	&__ruler {
		position:       absolute;
		top:            0;
		left:           0;
		display:        flex;
		gap:            8px;
		width:          max-content;
		height:         0;
		overflow:       hidden;
		pointer-events: none;
		visibility:     hidden;

		.smart__item {
			max-width: none;
		}
	}

	// Обёртка подсказки: в ряду не сжимается, длинное название обрезается внутри кнопки
	&__tip {
		display:   inline-flex;
		flex:      none;
		min-width: 0;
		max-width: 100%;
	}

	// Шаблон — обычная кнопка; в ряду не сжимается и не переносится, длинное название обрезается
	&__item {
		flex:      none;
		max-width: 100%;
		height:    36px;
	}
}
</style>
