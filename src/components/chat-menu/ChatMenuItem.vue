<script setup lang="ts">
import {computed, useSlots} from 'vue';
import {CounterBadge} from '@dns-modules/badge';
import PriorityIcon from '../PriorityIcon.vue';
import UserAvatar from '../UserAvatar.vue';

import '@dns-modules/badge/style.css';

/**
 * Пункт меню чатов.
 * Состояния как у MenuItem из @dns-modules/menu: selected — брендовая полоса слева,
 * hover — брендовый текст (кроме выбранного), focus-visible — тёмная обводка, disabled — без реакции.
 * Вложенные пункты (слот items) раскрываются только у выбранного пункта.
 */

const props = withDefaults(defineProps<{
	name: string;
	preview?: string;
	time?: string;
	/** Наивысший приоритет среди тикетов человека; показывается слева от бейджа */
	priority?: string;
	/** Подсказка приоритета: сколько самое долгое обращение человека висит без ответа */
	waitText?: string;
	/** Число в бейдже справа (например, активные тикеты); 0 — бейдж не показывается */
	badge?: number;
	online?: boolean;
	isSelected?: boolean;
	/** Открыта панель вложенных пунктов (тикетов) этого пункта: подсвечивается фоном primary */
	isActive?: boolean;
	/** Раскрыт ли список вложенных пунктов; по умолчанию раскрыт у выбранного */
	isExpanded?: boolean;
	isDisabled?: boolean;
}>(), {
	preview:    '',
	time:       '',
	priority:   '',
	waitText:   '',
	badge:      0,
	online:     false,
	isSelected: false,
	isActive:   false,
	isExpanded: undefined,
	isDisabled: false,
});

const emit = defineEmits<{click: []}>();

const slots = useSlots();

const isOpen = computed(() => (props.isExpanded ?? props.isSelected) && !!slots.items);

function onClick() {
	if (!props.isDisabled) {
		emit('click');
	}
}
</script>

<template>
	<li class="item">
		<button
			type="button"
			class="item__row"
			:class="{
				'item__row--selected': isSelected,
				'item__row--active':   isActive,
				'item__row--disabled': isDisabled,
			}"
			:disabled="isDisabled"
			:aria-current="isSelected ? 'true' : undefined"
			:aria-expanded="slots.items ? isOpen : undefined"
			@click="onClick"
		>
			<user-avatar class="item__avatar" :name="name" :size="40" :online="online" />
			<span class="item__body">
				<span class="item__line">
					<span class="item__name">{{ name }}</span>
					<span v-if="time" class="item__time">{{ time }}</span>
				</span>
				<span class="item__line">
					<span class="item__preview">{{ preview }}</span>
					<priority-icon class="item__priority" :priority="priority" :hint="waitText" />
					<counter-badge v-if="badge" class="item__badge" color="gray">{{ badge }}</counter-badge>
				</span>
			</span>
		</button>

		<transition name="item-expand">
			<div v-if="isOpen" class="item__items">
				<div class="item__clip">
					<ul class="item__list" role="group">
						<slot name="items" />
					</ul>
				</div>
			</div>
		</transition>
	</li>
</template>

<style scoped lang="scss">
.item {
	display:        flex;
	flex-direction: column;

	&__row {
		display:     flex;
		gap:         12px;
		align-items: center;
		position:      relative;
		// Поля по бокам: фон при наведении и выборе — скруглённая плашка, а полоса выбора уходит в поле слева
		width:         calc(100% - 16px);
		min-height:    64px;
		padding:       10px 12px;
		margin:        0 8px;
		font:          inherit;
		color:         var(--text-primary, #333);
		text-align:    start;
		cursor:        pointer;
		background:    transparent;
		border:        none;
		border-radius: 12px;
		transition:    background-color 0.2s;

		// Полоса выбора: ниже строки и со скруглением
		&::before {
			position:      absolute;
			top:           16px;
			bottom:        16px;
			left:          4px;
			width:         3px;
			content:       '';
			background:    var(--stroke-border-brand, #fc8507);
			border-radius: 3px;
			opacity:       0;
			transition:    opacity 0.2s;
		}

		// Состояния меняют только фон, цвет текста не трогаем. Работают одинаково у любого пункта, в том числе выбранного
		&:hover:not(:disabled) {
			background-color: var(--background-primary, #f7f7f7);
		}

		&:active:not(:disabled) {
			background-color: var(--background-neutral-light, #eee);
		}

		&:focus-visible {
			outline:        1px solid var(--stroke-border-dark, #434242);
			outline-offset: -1px;
		}

		&--selected::before {
			opacity: 1;
		}

		// Открыта панель тикетов этого человека — фон primary; при наведении и нажатии темнее.
		// Чат, открытый в диалоге, отмечен только полосой слева
		&--active {
			background-color: var(--background-primary, #f7f7f7);

			&:hover:not(:disabled),
			&:active:not(:disabled) {
				background-color: var(--background-neutral-light, #eee);
			}
		}

		&--disabled {
			cursor: default;

			.item__name,
			.item__preview,
			.item__time {
				color: var(--text-disabled, #bbb);
			}

			.item__avatar {
				opacity: 0.5;
			}
		}
	}

	&__body {
		display:        flex;
		flex:           1;
		flex-direction: column;
		gap:            2px;
		min-width:      0;
	}

	&__line {
		display:     flex;
		gap:         8px;
		align-items: center;
		min-width:   0;
	}

	&__name {
		flex:          1;
		min-width:     0;
		overflow:      hidden;
		font-size:     16px;
		font-weight:   700;
		line-height:   24px;
		text-overflow: ellipsis;
		white-space:   nowrap;
		transition:    color 0.2s;
	}

	&__time {
		flex:      none;
		font-size: 14px;
		color:     var(--text-tertiary, #7d7c7c);
	}

	&__preview {
		flex:          1;
		min-width:     0;
		overflow:      hidden;
		font-size:     14px;
		line-height:   20px;
		color:         var(--text-secondary, #4e4e4e);
		text-overflow: ellipsis;
		white-space:   nowrap;
	}

	&__badge {
		flex: none;
	}

	// Раскрытие и сворачивание вложенных пунктов: как .expanded в DS-меню, но без замера высоты
	&__items {
		display:            grid;
		grid-template-rows: 1fr;
		background-color:   var(--background-secondary, #fff);
	}

	// Обрезает список при сворачивании: у самого списка есть padding, и до нуля он не схлопнется
	&__clip {
		min-height: 0;
		overflow:   hidden;
	}

	&__list {
		display:        flex;
		flex-direction: column;
		gap:            2px;
		// Слева: текст тикета встаёт на одну линию с именем клиента (аватар 40 + отступы − точка статуса)
		padding:        4px 8px 8px 45px;
		margin:         0;
		list-style:     none;
	}
}

.item-expand-enter-active,
.item-expand-leave-active {
	transition: grid-template-rows 0.3s ease, opacity 0.3s ease;
}

.item-expand-enter-from,
.item-expand-leave-to {
	grid-template-rows: 0fr;
	opacity:            0;
}

@media (prefers-reduced-motion: reduce) {
	.item-expand-enter-active,
	.item-expand-leave-active {
		transition: none;
	}
}
</style>
