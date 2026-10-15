<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {BaseUiButton, BaseUiIconButton, SIZE, VARIANT} from '@dns-modules/base-ui-button';
import {IconHorizontalDots} from '@dns-modules/font-icon';
import {IconActionAdd, IconActionEdit, IconDataPhone, IconNavChevronLeft, IconNavChevronRight, IconProductCustomFilm} from '@dns-modules/font-icon-v3';
import {FloatingMenuList, MenuItem, POSITIONS} from '@dns-modules/menu';
import {Scrollbar} from '@dns-modules/scrollbar';
import {useCrmStore} from '../stores/crm';
import type {Message} from '../types';
import {datePart, dayLabel, longTime, shortTime, shortTopic, starStr, timePart} from '../utils/format';
import CloseWidget from './CloseWidget.vue';
import DialogComposer from './DialogComposer.vue';
import FileTile from './FileTile.vue';
import ImageViewer from './ImageViewer.vue';
import UserAvatar from './UserAvatar.vue';
import emptyImg from '../assets/empty-chat.png';

import '@dns-modules/base-ui-button/style.css';
import '@dns-modules/menu/style.css';
import '@dns-modules/scrollbar/style.css';

/**
 * Диалог: шапка активного sub-чата, лента сообщений, AI-карточка, композер
 */

const store    = useCrmStore();
const listRef  = ref<InstanceType<typeof Scrollbar> | null>(null);

/** Ширина шапки, при которой три кнопки ещё помещаются в ряд */
const FULL_ACTIONS_MIN_WIDTH = 900;

const headRef     = ref<HTMLElement | null>(null);
const moreRef     = ref<InstanceType<typeof BaseUiIconButton> | null>(null);
const isCompact   = ref(false);
const isMenuOpen  = ref(false);
let observer: ResizeObserver | null = null;

onMounted(() => {
	observer = new ResizeObserver(([entry]) => {
		isCompact.value = !!entry && entry.contentRect.width < FULL_ACTIONS_MIN_WIDTH;
		if (!isCompact.value) {
			isMenuOpen.value = false;
		}
	});
	if (headRef.value) {
		observer.observe(headRef.value);
	}
});

onBeforeUnmount(() => observer?.disconnect());

/** Вызов клиента: открывает tel: с цифрами номера */
function callClient() {
	window.location.href = `tel:${(store.client?.phone ?? '').replace(/[^\d+]/g, '')}`;
}

/** Действие из меню «⋯» */
function runFromMenu(id: 'transfer' | 'service') {
	isMenuOpen.value = false;
	store.runAction(id);
}

const messages = computed(() => store.messagesOf(store.ticketId));

/** Класс сообщения: клиент слева, оператор справа; сообщения прошлого оператора — серые */
function msgClass(sender: string, isPrev: boolean) {
	return 'client' === sender ? 'msg--client' : ['msg--op', {'msg--prev': isPrev}];
}

/** «Когда» в тегах: только время, например «12:38»; идёт после «кто». Если времени нет — дата */
function whenLabel(ts?: string) {
	return timePart(ts) || datePart(ts);
}

/** Открытое в модальном окне изображение из чата */
const viewer = ref<{src: string; name: string} | null>(null);

/** Тег прошлого оператора: аватар, имя, почта и время. Ставится один раз — над его первым бабблом, когда его назначили */
interface AuthorLabel {
	name: string;
	email: string;
	ts: string;
}

/** Элемент группы сообщений: обычное сообщение или подряд идущие вложения одного отправителя (одна строка плиток) */
type FeedItem =
	| {kind: 'message'; key: string; message: Message; author: string; label: AuthorLabel | null}
	| {kind: 'files'; key: string; sender: string; batch?: string; files: Message[]; author: string; label: AuthorLabel | null};

/** Блок сообщений одной передачи обращения: до разделителя передачи, нового дня или конца ленты */
interface FeedBlock {
	kind: 'block';
	key: string;
	items: FeedItem[];
}

/**
 * Имя файла и подпись: «IMG_4521.jpg (фото мокрых документов)» → имя «IMG_4521.jpg» и подпись «фото мокрых документов».
 * У файлов, отправленных оператором, подписи нет
 */
function fileParts(text: string): {name: string; caption: string} {
	const match = /^(.+?)\s*\((.+)\)\s*$/.exec(text);

	return {name: match?.[1] ?? text, caption: match?.[2] ?? ''};
}

/** Разделитель передачи обращения: тег между блоками */
interface FeedHandoff {
	kind: 'handoff';
	key: string;
	message: Message;
}

/**
 * День ленты: серый тег с датой («Сегодня», «Вчера», «1 сентября») и всё, что написано в этот день.
 * Тег «прилипает» к верху ленты, пока виден его день, — поэтому день собран в один контейнер
 */
interface FeedDay {
	key: string;
	label: string;
	entries: (FeedBlock | FeedHandoff)[];
}

/**
 * Лента по дням: внутри дня разделители передачи и блоки сообщений. Подпись прошлого оператора (аватар, имя, почта)
 * стоит над первым бабблом из подряд идущих его сообщений; блок заканчивается там, где начинается разделитель передачи или новый день
 */
const feed = computed(() => {
	const days: FeedDay[] = [];
	let day: FeedDay | null     = null;
	let block: FeedBlock | null = null;
	let lastDate   = '';
	let lastAuthor = '';

	for (const m of messages.value) {
		const date = datePart(m.ts);

		// Новый день: свой контейнер с тегом даты, блок сообщений прерывается
		if (!day || (date && date !== lastDate)) {
			day = {key: `day-${m.message_id}`, label: date ? dayLabel(date) : '', entries: []};
			days.push(day);
			lastDate = date || lastDate;
			block    = null;
		}

		if ('system' === m.sender && 'assign' === m.type) {
			day.entries.push({kind: 'handoff', key: m.message_id, message: m});
			block = null;

			continue;
		}

		if (!block) {
			block = {kind: 'block', key: m.message_id, items: []};
			day.entries.push(block);
		}

		const last   = block.items[block.items.length - 1];
		const author = 'system' === m.sender ? '' : (m.author ?? '');
		// Тег прошлого оператора — один раз, когда его назначили: у его первого сообщения, а не у каждого бабла
		const label  = author && author !== lastAuthor ? {name: author, email: m.author_email ?? '', ts: m.ts} : null;

		if (author) {
			lastAuthor = author;
		}

		if ('attachment' !== m.type || 'system' === m.sender) {
			block.items.push({kind: 'message', key: m.message_id, message: m, author, label});
		} else if ('files' === last?.kind && last.sender === m.sender && !!m.batch && last.batch === m.batch) {
			// Одна группа плиток — только файлы одной отправки: отдельные отправки остаются отдельными сообщениями
			last.files.push(m);
		} else {
			block.items.push({kind: 'files', key: m.message_id, sender: m.sender, batch: m.batch, files: [m], author, label});
		}
	}

	return days;
});

watch(
	() => [store.ticketId, messages.value.length, store.ticket?.closureReq, store.ticket?.saidYes],
	async () => {
		await nextTick();
		const el = listRef.value?.$el as HTMLElement | undefined;

		if (el) {
			el.scrollTop = el.scrollHeight;
		}
	},
	{immediate: true, flush: 'post'},
);
</script>

<template>
	<section v-if="store.chat && store.ticket" class="dialog">
		<div ref="headRef" class="dialog__head">
			<!-- Ручка у правого края шапки: открывает и скрывает правую панель с деталями обращения -->
			<base-ui-icon-button
				class="dialog__edge"
				:variant="VARIANT.secondary"
				:size="SIZE.small"
				:title="store.isDetailsOpen ? 'Скрыть детали обращения' : 'Показать детали обращения'"
				:aria-label="store.isDetailsOpen ? 'Скрыть детали обращения' : 'Показать детали обращения'"
				:aria-expanded="store.isDetailsOpen"
				@click="store.isDetailsOpen = !store.isDetailsOpen"
			>
				<icon-nav-chevron-right v-if="store.isDetailsOpen" />
				<icon-nav-chevron-left v-else />
			</base-ui-icon-button>

			<!-- Первая строка: профиль (клик открывает детали обращения) и кнопки правой панели -->
			<div class="dialog__row dialog__row--top">
				<button
					type="button"
					class="dialog__person"
					title="Открыть детали обращения"
					aria-label="Открыть детали обращения"
					@click="store.isDetailsOpen = true"
				>
					<user-avatar :name="store.client?.name" />
					<span class="dialog__name-row">
						<span class="dialog__name">{{ store.client?.name }}</span>
						<span class="dialog__status">
							<span class="dialog__dot" :class="{'dialog__dot--on': '1' === store.chat.online}" />
							{{ '1' === store.chat.online ? 'онлайн' : 'не в сети' }}
						</span>
					</span>
				</button>
				<div class="dialog__tools">
					<base-ui-icon-button
						:variant="VARIANT.secondary"
						:size="SIZE.small"
						title="Позвонить клиенту"
						aria-label="Позвонить клиенту"
						@click="callClient"
					>
						<icon-data-phone />
					</base-ui-icon-button>
				</div>
			</div>

			<!-- Вторая строка: тема обращения и действия по нему -->
			<div class="dialog__row dialog__row--bottom">
				<div class="dialog__sub">
					<span class="dialog__topic">{{ store.ticket.site_topic || shortTopic(store.ticket.topic) }}</span>
					<base-ui-icon-button
						class="dialog__topic-edit"
						:variant="VARIANT.secondary"
						:size="SIZE.tiny"
						:disabled="store.isClosed"
						title="Изменить тему обращения"
						aria-label="Изменить тему обращения"
						aria-haspopup="dialog"
						@click="store.isTopicOpen = true"
					>
						<icon-action-edit />
					</base-ui-icon-button>
				</div>
				<div class="dialog__actions">
					<template v-if="!isCompact">
						<base-ui-button :variant="VARIANT.secondary" :size="SIZE.small" :disabled="store.isClosed" @click="store.runAction('transfer')">
							Перевести на другого оператора
						</base-ui-button>
						<base-ui-button :variant="VARIANT.secondary" :size="SIZE.small" :disabled="store.isClosed" @click="store.runAction('service')">
							Создать заявку в СЦ
						</base-ui-button>
					</template>
					<base-ui-button
						:size="SIZE.small"
						:disabled="store.isClosed || store.ticket.closureReq"
						@click="store.requestClosure()"
					>
						Вопрос решён
					</base-ui-button>
					<!-- Кнопка и меню в одной обёртке: открытое меню не добавляет элемент в ряд кнопок и не меняет его ширину -->
					<div v-if="isCompact" class="dialog__more">
						<base-ui-icon-button
							ref="moreRef"
							:variant="VARIANT.secondary"
							:size="SIZE.small"
							:disabled="store.isClosed"
							title="Ещё"
							@click="isMenuOpen = !isMenuOpen"
						>
							<icon-horizontal-dots />
						</base-ui-icon-button>
						<floating-menu-list
							v-if="isMenuOpen"
							:reference="moreRef?.$el ?? null"
							:position="POSITIONS.bottomEnd"
							@close="isMenuOpen = false"
						>
							<menu-item :has-arrow="false" @click="runFromMenu('transfer')">
								<template #title>Перевести на другого оператора</template>
							</menu-item>
							<menu-item :has-arrow="false" @click="runFromMenu('service')">
								<template #title>Создать заявку в СЦ</template>
							</menu-item>
						</floating-menu-list>
					</div>
				</div>
			</div>
		</div>

		<scrollbar ref="listRef" class="dialog__msgs">
			<section v-for="day in feed" :key="day.key" class="day">
				<!-- Серый тег даты без разделителя: при прокрутке держится у верха ленты, пока виден его день -->
				<div v-if="day.label" class="day-sep">{{ day.label }}</div>
				<template v-for="entry in day.entries" :key="entry.key">
					<div v-if="'handoff' === entry.kind" class="handoff">
						<span class="handoff__tag">
							{{ entry.message.text }}
							<span class="tag-sep" aria-hidden="true" />
							{{ whenLabel(entry.message.ts) }}
						</span>
					</div>
					<div v-else class="dialog__block">
						<div class="dialog__group">
							<template v-for="item in entry.items" :key="item.key">
								<!-- Прошлый оператор: тег с аватаром, именем, почтой и временем — один раз, над его первым бабблом; по бокам пунктир -->
								<div v-if="item.label" class="author-tag">
									<span class="author-tag__pill">
										<user-avatar :name="item.label.name" :size="24" />
										<span class="author-tag__name">{{ item.label.name }}</span>
										<template v-if="item.label.email">
											<span class="tag-sep" aria-hidden="true" />
											<span class="author-tag__email">{{ item.label.email }}</span>
										</template>
										<span class="tag-sep" aria-hidden="true" />
										{{ whenLabel(item.label.ts) }}
									</span>
								</div>
								<!-- Вложения: плитки как в поле ввода, подряд идущие файлы одного отправителя — одной строкой -->
								<div v-if="'files' === item.kind" class="msg" :class="msgClass(item.sender, !!item.author)">
									<div class="msg__files">
										<file-tile
											v-for="f in item.files"
											:key="f.message_id"
											:name="fileParts(f.text).name"
											:preview-url="f.preview"
											is-openable
											@open="viewer = {src: f.preview ?? '', name: fileParts(f.text).name}"
										/>
									</div>
									<template v-for="f in item.files" :key="f.message_id">
										<div v-if="fileParts(f.text).caption" class="msg__bubble">{{ fileParts(f.text).caption }}</div>
									</template>
									<span class="msg__time">{{ timePart(item.files[item.files.length - 1]?.ts) || shortTime(item.files[item.files.length - 1]?.ts) }}</span>
								</div>
								<div v-else-if="'system' === item.message.sender && 'event' === item.message.type" class="sys-event">
									{{ item.message.text }}
									<span class="tag-sep" aria-hidden="true" />
									{{ whenLabel(item.message.ts) }}
								</div>
								<div v-else-if="'system' === item.message.sender" class="sys-action">{{ item.message.text }}</div>
								<div v-else class="msg" :class="msgClass(item.message.sender, !!item.author)">
									<div class="msg__bubble">{{ item.message.text }}</div>
									<span class="msg__time">{{ timePart(item.message.ts) || shortTime(item.message.ts) }}</span>
								</div>
							</template>
						</div>
					</div>
				</template>
			</section>

			<div v-if="store.isClosed" class="closure">
				✔ Клиент подтвердил: <b>проблема решена</b><br>
				<span class="closure__stars">{{ starStr(store.ticket.csat) }}</span>
				<template v-if="store.ticket.csat"> {{ store.ticket.csat }} / 5</template>
				<div class="closure__dim">
					Тикет закрыт клиентом · {{ longTime(store.ticket.date) }}<template v-if="'1' === store.ticket.fcr"> · решено с первого контакта (FCR)</template>
				</div>
			</div>

			<close-widget v-if="!store.isClosed && store.ticket.closureReq" :ticket="store.ticket" />
		</scrollbar>

		<!-- Тег заметки над полем ввода справа, вне прокрутки: серый, пока заметки нет, жёлтый, когда она есть; клик открывает поповер -->
		<div class="note-tag-row">
			<button
				type="button"
				class="note-tag"
				:class="{'note-tag--filled': !!store.noteOf(store.ticketId)}"
				aria-haspopup="dialog"
				:title="store.noteOf(store.ticketId) ? 'Открыть заметку' : 'Добавить заметку'"
				@click="store.isNoteOpen = !store.isNoteOpen"
			>
				<icon-product-custom-film v-if="store.noteOf(store.ticketId)" class="note-tag__icon" />
				<icon-action-add v-else class="note-tag__icon" />
				{{ store.noteOf(store.ticketId) ? 'Заметка' : 'Добавить заметку' }}
			</button>
		</div>

		<image-viewer v-if="viewer" :src="viewer.src" :name="viewer.name" @close="viewer = null" />

		<dialog-composer />
	</section>
	<section v-else class="dialog dialog--empty">
		<div class="empty">
			<img class="empty__img" :src="emptyImg" alt="" width="240">
			<span class="empty__title">Чат не выбран</span>
			<span class="empty__text">Выберите чат в списке слева, чтобы начать диалог</span>
		</div>
	</section>
</template>

<style scoped lang="scss">
// Время сообщения лежит в строке с пустотой под цифрами (~4px). Чтобы расстояние от видимого текста времени до тега
// совпадало с расстоянием от тега до следующего сообщения, группа с тегом в начале сдвигается вверх на эту величину
$time-leading: 4px;

// Лёгкое размытие подложки тегов: они лежат поверх узора ленты, и узор не спорит с текстом
@mixin tag-blur {
	backdrop-filter: blur(4px);
}

.dialog {
	display:        flex;
	flex:           1;
	flex-direction: column;
	min-width:      0;
	min-height:     0;

	// Чат не выбран: пустая область с тем же узором, что и у ленты, и плашка по центру (как в Telegram)
	&--empty {
		align-items:     center;
		justify-content: center;
		color:           var(--crm-ink3);

		--feed-bg: var(--background-primary, #f7f7f7);

		background-color:  var(--feed-bg);
		background-image:
			linear-gradient(color-mix(in srgb, var(--feed-bg) 93%, transparent), color-mix(in srgb, var(--feed-bg) 93%, transparent)),
			url('../assets/chat-pattern.png');
		background-size:   auto, 480px 480px;
		background-repeat: no-repeat, repeat;
	}

	// Шапка из двух частей на всю ширину: верхняя (профиль и кнопки правой панели) отделена линией снизу,
	// нижняя (тема обращения и действия по нему) на более тёмном фоне
	&__head {
		position:       relative;
		display:        flex;
		flex:           none;
		flex-direction: column;
		background:     var(--crm-panel);
	}

	// Ручка правой панели: вторичная иконочная кнопка шириной 24 px и высотой 36 px, как кнопки шапки, вплотную к правому краю
	// по центру верхней строки; скруглена только со стороны чата
	&__edge {
		position:      absolute;
		top:           14.5px;
		right:         0;
		z-index:       1;
		width:         24px;
		min-width:     24px;
		height:        36px;
		padding:       0;
		border-radius: 8px 0 0 8px;
	}

	&__row {
		display:         flex;
		flex-wrap:       wrap;
		gap:             8px 12px;
		align-items:     center;
		justify-content: space-between;
		min-width:       0;
		padding:         10px 18px;

		// Справа место под ручку правой панели (24 px) и зазор: только в верхней строке, где она стоит
		&--top {
			padding-right: 36px;
			border-bottom: 1px solid var(--crm-line);
		}

		&--bottom {
			background:    var(--background-secondary, #fff);
			border-bottom: 1px solid var(--stroke-border-light, #eee);
		}
	}

	// Кнопки шапки: звонок
	&__tools {
		display:     flex;
		flex:        none;
		gap:         8px;
		align-items: center;
	}

	&__actions {
		display:     flex;
		flex:        none;
		gap:         8px;
		align-items: center;
	}

	&__more {
		display: flex;
	}

	// Профиль — кнопка: клик открывает детали обращения. Фон при наведении, как у пунктов списка
	&__person {
		display:       flex;
		gap:           12px;
		align-items:   center;
		min-width:     0;
		// Отступы больше, но на раскладку не влияют: отрицательные поля компенсируют padding, аватар и высота шапки на месте
		padding:       8px 16px 8px 8px;
		margin:        -4px 0 -4px -8px;
		font:          inherit;
		color:         inherit;
		text-align:    start;
		cursor:        pointer;
		background:    none;
		border:        none;
		border-radius: 12px;
		transition:    background-color 0.2s;

		&:hover {
			background: var(--background-neutral-light, #eee);
		}

		&:focus-visible {
			outline:        1px solid var(--stroke-border-dark, #434242);
			outline-offset: 1px;
		}
	}

	&__name {
		font-size:   16px;
		font-weight: 700;
		line-height: 24px;
	}

	&__name-row {
		display:     flex;
		flex-wrap:   wrap;
		gap:         4px 12px;
		align-items: center;
		min-width:   0;
	}

	&__status {
		display:     inline-flex;
		flex:        none;
		gap:         6px;
		align-items: center;
		font-size:   14px;
		line-height: 20px;
		color:       var(--crm-ink2);
	}

	// Тема обращения: занимает свободное место слева от действий, длинная переносится
	&__sub {
		display:     flex;
		flex:        1;
		gap:         8px;
		align-items: center;
		min-width:   0;
		font-size:   16px;
		color:       var(--crm-ink2);
	}

	&__topic {
		min-width: 0;
	}

	// Кнопка не сжимается; отрицательные поля — высота строки остаётся прежней
	&__topic-edit {
		flex:   none;
		margin: -4px 0;
	}

	&__dot {
		display:       inline-block;
		width:         7px;
		height:        7px;
		background:    #c3ccd8;
		border-radius: 50%;

		&--on {
			background: var(--crm-green);
		}
	}

	&__msgs {
		display:        flex;
		flex:           1;
		flex-direction: column;
		gap:            16px;
		// Снизу запас под тег заметки, который лежит поверх нижнего края ленты
		padding:        18px 22px 66px;
		overflow-y:     auto;

		// Фон ленты — бесшовный тайл с узором. Поверх него полупрозрачная заливка цветом фона ленты приглушает линии,
		// чтобы узор не спорил с текстом; размер плитки задан, чтобы линии не были слишком мелкими на больших экранах
		--feed-bg: var(--background-primary, #f7f7f7);

		background-color:  var(--feed-bg);
		background-image:
			linear-gradient(color-mix(in srgb, var(--feed-bg) 93%, transparent), color-mix(in srgb, var(--feed-bg) 93%, transparent)),
			url('../assets/chat-pattern.png');
		background-size:   auto, 480px 480px;
		background-repeat: no-repeat, repeat;
	}

	// Блок одного оператора: плашка (тег) и группа его сообщений. Границы блока ограничивают путь «прилипшей» плашки.
	// Расстояние между тегом и сообщением — 16px, между сообщениями — 8px (gap группы)
	&__block {
		display:        flex;
		flex:           none;
		flex-direction: column;
		gap:            16px;
	}

	&__group {
		display:        flex;
		flex:           none;
		flex-direction: column;
		gap:            8px;
	}

	// Тег после блока сообщений: время сообщения лежит в строке с пустотой под цифрами, её вычитаем из отступа
	&__block + &__block,
	&__block + .handoff {
		margin-top: -$time-leading;
	}
}

// Плашка «чат не выбран» по центру пустой области
.empty {
	display:        flex;
	flex-direction: column;
	gap:            4px;
	align-items:    center;
	max-width:      360px;
	padding:        16px 24px;
	text-align:     center;

	&__img {
		width:         240px;
		max-width:     100%;
		height:        auto;
		margin-bottom: 12px;
		user-select:   none;
		pointer-events: none;
	}

	&__title {
		font-size:   16px;
		font-weight: 600;
		color:       var(--crm-ink2, var(--crm-ink3));
	}

	&__text {
		font-size: 14px;
		color:     var(--crm-ink3);
	}
}

// День ленты: тег даты и сообщения этого дня. Отдельный контейнер нужен, чтобы тег держался у верха, пока виден день
.day {
	display:        flex;
	flex:           none;
	flex-direction: column;
	gap:            16px;

	// Тег после блока сообщений: время сообщения лежит в строке с пустотой под цифрами, её вычитаем из отступа
	& + & {
		margin-top: -$time-leading;
	}
}

// Тег прошлого оператора над его первым бабблом: белая плашка по центру ленты, по бокам пунктир, как у назначения обращения.
// От предыдущего бабла 16px (gap группы 8px + поле 8px)
.author-tag {
	display:     flex;
	gap:         12px;
	align-items: center;
	margin:      8px 0;

	&:first-child {
		margin-top: 0;
	}

	&::before,
	&::after {
		flex:       1;
		content:    '';
		border-top: 1px dashed var(--stroke-border, #d2d1d1);
	}

	&__pill {
		display:       flex;
		flex:          none;
		gap:           8px;
		align-items:   center;
		max-width:     100%;
		padding:       4px 12px 4px 4px;
		font-size:     14px;
		color:         var(--text-secondary, #4e4e4e);
		background:    var(--background-secondary, #fff);
		border-radius: 20px;
		box-shadow:    var(--effect-plate, 0 1px 2px rgba(0, 0, 0, 0.1));
	}

	&__name {
		font-weight: 600;
		color:       var(--crm-ink2);
		white-space: nowrap;
	}

	&__email {
		overflow:      hidden;
		text-overflow: ellipsis;
		white-space:   nowrap;
	}
}

// Назначение обращения: тег по центру ленты, по бокам пунктир
.handoff {
	display:     flex;
	gap:         12px;
	align-items: center;

	&::before,
	&::after {
		flex:       1;
		content:    '';
		border-top: 1px dashed var(--stroke-border, #d2d1d1);
	}

	&__tag {
		display:       flex;
		flex:          none;
		gap:           8px;
		align-items:   center;
		padding:       4px 12px;
		font-size:     14px;
		color:         var(--text-secondary, #4e4e4e);
		background:    var(--background-secondary, #fff);
		border-radius: 20px;
		box-shadow:    var(--effect-plate, 0 1px 2px rgba(0, 0, 0, 0.1));
	}
}

// Тег даты, как в Telegram: «Сегодня», «Вчера», «1 сентября» — серый, без разделителя; следует за прокруткой у верха ленты
.day-sep {
	position:      sticky;
	top:           -10px; // padding ленты (18px) минус зазор 8px до шапки
	z-index:       2;
	align-self:    center;
	padding:       4px 12px;
	font-size:     14px;
	color:         var(--text-primary, #333);
	background:    var(--background-neutral-transparent, rgba(0, 0, 0, 0.12));
	border-radius: 20px;
	// Закреплённый тег с блюром рисуется отдельным слоем: иначе при скролле он подрагивает относительно ленты
	will-change:   transform;

	@include tag-blur;
}

// Тег заметки: над полем ввода справа. Строка нулевой высоты на границе ленты и композера, сам тег поднят над ней
// и не прокручивается вместе с сообщениями. Отступ снизу 16px равен внутреннему отступу карточки заметки:
// открытая карточка накрывает тег своей кнопкой «Скрыть заметку» и не заходит на композер
.note-tag-row {
	position: relative;
	z-index:  2;
	flex:     none;
	height:   0;

	> .note-tag {
		position: absolute;
		right:    24px;
		bottom:   16px;
	}
}

// Тег — «чип» с белой заливкой, рамкой и лёгкой тенью, как белые пузыри клиента: так он не сливается с серой лентой и узором.
// Пустая заметка — нейтральная рамка, есть заметка — жёлтая заливка и жёлтая рамка.
// Наведение не меняет цвет заливки: рамка темнеет, тень чуть растёт; нажатие возвращает тень
.note-tag {
	--tag-bg:           var(--background-secondary, #fff);
	--tag-border:       var(--stroke-border, #d2d1d1);
	--tag-border-hover: var(--stroke-border-hover, #a7a5a5);
	--tag-icon:         var(--text-tertiary, #7d7c7c);

	display:       inline-flex;
	gap:           6px;
	align-items:   center;
	min-height:    36px;
	padding:       0 14px 0 12px;
	font:          inherit;
	font-size:     14px;
	font-weight:   500;
	color:         var(--text-secondary, #4e4e4e);
	cursor:        pointer;
	background:    var(--tag-bg);
	border:        1px solid var(--tag-border);
	border-radius: 18px;
	box-shadow:    0 1px 2px rgba(0, 0, 0, 0.08);
	transition:    border-color 0.15s, box-shadow 0.15s, background-color 0.15s;

	&:hover {
		border-color: var(--tag-border-hover);
		box-shadow:   0 2px 6px rgba(0, 0, 0, 0.14);
	}

	&:active {
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
	}

	// Заметка есть — жёлтый тег: жёлтая рамка и тёмный текст, значок насыщенного янтарного цвета
	&--filled {
		--tag-bg:           var(--background-warning-light, #fff7da);
		--tag-border:       var(--background-warning-main, #ffca48);
		--tag-border-hover: var(--background-warning-dark, #d09e04);
		--tag-icon:         #cd7f00;

		color: var(--text-primary, #333);
	}

	&:focus-visible {
		outline:        1px solid var(--stroke-border-dark, #434242);
		outline-offset: 2px;
	}

	&__icon {
		flex:      none;
		font-size: 16px;
		color:     var(--tag-icon);
	}
}

@media (prefers-reduced-motion: reduce) {
	.note-tag {
		transition: none;
	}
}

// Вертикальная черта между частями тега: элемент разметки, а не символ, чтобы её высотой и цветом управлял CSS
.tag-sep {
	flex:       none;
	align-self: center;
	width:      1px;
	height:     12px;
	background: var(--text-tertiary, #7d7c7c);
}

// Системное событие внутри группы — тоже тег: от него до соседних сообщений 16px (gap группы 8px + поле 8px)
.dialog__group > .sys-event {
	margin: 8px 0;

	&:first-child {
		margin-top: 0;
	}

	&:last-child {
		margin-bottom: 0;
	}
}

.msg + .sys-event {
	margin-top: 8px - $time-leading;
}

.sys-event {
	display:       flex;
	gap:           8px;
	align-items:   center;
	align-self:    center;
	padding:       4px 12px;
	font-size:     14px;
	color:         var(--text-secondary, #4e4e4e);
	background:    var(--background-neutral-light, #eee);
	border-radius: 20px;

	@include tag-blur;
}

.sys-action {
	align-self:    center;
	max-width:     78%;
	padding:       8px 14px;
	font-size:     14px;
	color:         #14532d;
	text-align:    center;
	background:    var(--crm-green-bg);
	border:        1px solid #bfe8cc;
	border-radius: 10px;
}

// Сообщения: клиент слева в белом бабле, оператор справа в синем; острый нижний угол — со стороны отправителя
.msg {
	display:        flex;
	flex-direction: column;
	gap:            6px;
	max-width:      66%;

	&--client {
		align-self:  flex-start;
		align-items: flex-start;
	}

	&--op {
		align-self:  flex-end;
		align-items: flex-end;
	}

	&__bubble {
		padding:       12px 16px;
		font-size:     16px;
		line-height:   1.45;
		overflow-wrap: anywhere;
		border-radius: 16px;
	}

	&--client &__bubble {
		color:                     var(--text-primary, #333);
		background:                var(--background-secondary, #fff);
		border-bottom-left-radius: 0;
	}

	&--op &__bubble {
		color:                      var(--text-primary-inverse, #fff);
		background:                 var(--background-info-main, #3892f7);
		border-bottom-right-radius: 0;
	}

	// Сообщения прошлого оператора: та же форма, но фон disabled; текст основной
	&--prev &__bubble {
		color:      var(--text-primary, #333);
		background: var(--background-disabled, #eae8e8);
	}

	// Плитки вложений: строка с переносом, у оператора прижата вправо
	&__files {
		display:   flex;
		flex-wrap: wrap;
		gap:       8px;
	}

	&--op &__files {
		justify-content: flex-end;
	}

	&__time {
		font-size: 14px;
		color:     var(--text-tertiary, #7d7c7c);
	}
}
</style>
