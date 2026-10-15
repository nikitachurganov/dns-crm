<script setup lang="ts">
import PriorityIcon from '../PriorityIcon.vue';

/**
 * Вложенный пункт меню чатов (тикет клиента).
 * Состояния как у SubItem из @dns-modules/menu: hover и selected — подсветка фоном,
 * focus-visible — тёмная обводка, disabled — без реакции.
 */

const props = withDefaults(defineProps<{
	title: string;
	/** Последнее сообщение тикета */
	preview?: string;
	/** Приоритет тикета: high — высокий, medium — средний */
	priority?: string;
	/** Подсказка приоритета: сколько обращение висит без ответа */
	waitText?: string;
	date?: string;
	/** Статус тикета: открыт (показывается приоритет) или решён (иконки нет) */
	status?: 'open' | 'closed';
	/** Полная тема для подсказки */
	hint?: string;
	isSelected?: boolean;
	isDisabled?: boolean;
}>(), {
	preview:    '',
	priority:   '',
	waitText:   '',
	date:       '',
	status:     'open',
	hint:       '',
	isSelected: false,
	isDisabled: false,
});

const emit = defineEmits<{click: []}>();

function onClick() {
	if (!props.isDisabled) {
		emit('click');
	}
}
</script>

<template>
	<li class="sub">
		<button
			type="button"
			class="sub__row"
			:class="{
				'sub__row--selected': isSelected,
				'sub__row--disabled': isDisabled,
			}"
			:disabled="isDisabled"
			:aria-current="isSelected ? 'true' : undefined"
			@click="onClick"
		>
			<span class="sub__body">
				<span class="sub__line">
					<!-- Полная тема — системная подсказка только на названии: на иконке приоритета своя подсказка, две сразу не нужны -->
					<span class="sub__title" :title="hint || title">{{ title }}</span>
					<span v-if="date" class="sub__date">{{ date }}</span>
				</span>
				<!-- Вторая строка: сообщение слева, приоритет справа под датой; у закрытых тикетов приоритета нет.
				     При наведении на приоритет — его название и сколько обращение висит без ответа -->
				<span v-if="preview || 'open' === status" class="sub__line sub__line--meta">
					<span class="sub__preview">{{ preview }}</span>
					<span class="sub__icons">
						<priority-icon v-if="'open' === status" :priority="priority" :hint="waitText" />
					</span>
				</span>
			</span>
		</button>
	</li>
</template>

<style scoped lang="scss">
.sub {
	display: flex;

	&__row {
		display:       flex;
		flex:          1;
		gap:           8px;
		align-items:   flex-start;
		min-width:     0;
		min-height:    32px;
		padding:       6px 10px;
		font:          inherit;
		color:         var(--text-secondary, #4e4e4e);
		text-align:    start;
		cursor:        pointer;
		background:    transparent;
		border:        1px solid transparent;
		border-radius: 8px;
		transition:    background-color 0.3s;

		&:hover,
		&--selected {
			background-color: var(--background-date-range, rgba(255, 247, 218, 0.7));
		}

		// Выбранный пункт отличается только фоном — начертание текста не меняется
		&--selected {
			font-weight: 400;
		}

		&:focus-visible {
			outline:      none;
			border-color: var(--stroke-border-dark, #434242);
		}

		&--disabled {
			color:  var(--text-disabled, #bbb);
			cursor: default;

			&:hover {
				background-color: transparent;
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
		align-items: baseline;
		min-width:   0;

		// Во второй строке справа иконка: по базовой линии она проседает, поэтому выравниваем по центру строки текста
		&--meta {
			align-items: center;
		}
	}

	// Последнее сообщение тикета — вторая строка, одной строкой с многоточием
	&__icons {
		display:     flex;
		flex:        none;
		gap:         4px;
		align-items: center;
	}

	&__preview {
		overflow:      hidden;
		font-size:     14px;
		font-weight:   400;
		line-height:   20px;
		color:         var(--text-secondary, #4e4e4e);
		text-overflow: ellipsis;
		white-space:   nowrap;
	}

	// Название тикета — основной цвет текста, всегда жирное
	&__title {
		flex:          1;
		font-weight:   700;
		color:         var(--text-primary, #333);
		min-width:     0;
		overflow:      hidden;
		font-size:     14px;
		line-height:   20px;
		text-overflow: ellipsis;
		white-space:   nowrap;
	}

	&__date {
		flex:        none;
		font-size:   14px;
		font-weight: 400;
		color:       var(--text-tertiary, #7d7c7c);
	}
}
</style>
