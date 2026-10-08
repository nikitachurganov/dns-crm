<script setup lang="ts">
import {computed} from 'vue';
import {BaseUiButton, SIZE} from '@dns-modules/base-ui-button';
import {BaseTextarea} from '@dns-modules/base-textarea';
import {useCrmStore} from '../stores/crm';
import type {ReplyTone} from '../types';
import {checkKanc} from '../utils/kanc';

import '@dns-modules/base-ui-button/style.css';
import '@dns-modules/base-textarea/style.css';

/**
 * Композер: smart-replies трёх тонов, канцелярит-детектор, поле ввода
 */

const store = useCrmStore();

const TONES: {key: ReplyTone; label: string}[] = [
	{key: 'warm', label: 'тёплый'},
	{key: 'biz', label: 'деловой'},
	{key: 'emp', label: 'с эмпатией'},
];

const kanc = computed(() => checkKanc(store.draft));

/** Живая альтернатива канцеляриту */
const alternative = computed(() => store.intent?.replies.warm ?? '');

const placeholder = computed(() => (store.isClosed
	? `Тикет закрыт клиентом · оценка ${store.ticket?.csat || '—'}/5`
	: 'Написать клиенту…'));

function onEnter(event: KeyboardEvent) {
	event.preventDefault();
	store.send();
}
</script>

<template>
	<div class="composer" :class="{'composer--locked': store.isClosed}">
		<div v-if="kanc.length && !store.isClosed" class="kanc">
			<b>А- Канцелярит-детектор:</b> {{ kanc.join(', ') }} — звучит как переписка с госорганом.
			<div class="kanc__fix">
				<span>Живая альтернатива: «{{ alternative }}»</span>
				<base-ui-button :size="SIZE.tiny" @click="store.draft = alternative">Заменить</base-ui-button>
			</div>
		</div>

		<div v-if="!store.isClosed && store.intent" class="smart">
			<button
				v-for="tone in TONES"
				:key="tone.key"
				class="smart__item"
				:title="store.intent.replies[tone.key]"
				@click="store.draft = store.intent.replies[tone.key]"
			>
				<b :class="`smart__tag smart__tag--${tone.key}`">{{ tone.label }}</b>{{ store.intent.replies[tone.key] }}
			</button>
		</div>

		<div class="composer__row">
			<div class="composer__input" @keydown.enter.exact="onEnter">
				<base-textarea
					id="composer"
					v-model="store.draft"
					:placeholder="placeholder"
					:is-disabled="store.isClosed"
					:min-height="44"
					:max-height="120"
					:max-length="2000"
					:is-counter="false"
				/>
			</div>
			<base-ui-button :size="SIZE.large" :disabled="store.isClosed || !store.draft.trim()" title="Отправить" @click="store.send()">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 21.5l19-9.5-19-9.5v7.6l13 1.9-13 1.9z" /></svg>
			</base-ui-button>
		</div>
	</div>
</template>

<style scoped lang="scss">
.composer {
	flex:       none;
	padding:    10px 16px 12px;
	background: var(--crm-panel);
	border-top: 1px solid var(--crm-line);

	&--locked {
		opacity: 0.75;
	}

	&__row {
		display:     flex;
		gap:         10px;
		align-items: flex-end;
	}

	&__input {
		flex:      1;
		min-width: 0;
	}
}

.kanc {
	padding:       8px 12px;
	margin-bottom: 8px;
	font-size:     13px;
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
	display:        flex;
	gap:            8px;
	padding-bottom: 2px;
	margin-bottom:  8px;
	overflow-x:     auto;

	&__item {
		flex:          none;
		max-width:     270px;
		padding:       7px 11px;
		overflow:      hidden;
		font-size:     13px;
		color:         var(--crm-ink2);
		text-align:    left;
		text-overflow: ellipsis;
		white-space:   nowrap;
		cursor:        pointer;
		background:    var(--crm-bg);
		border:        1px solid var(--crm-line);
		border-radius: 10px;

		&:hover {
			background:   var(--crm-ai-bg);
			border-color: var(--crm-ai);
		}
	}

	&__tag {
		display:        inline-block;
		padding:        1.5px 6px;
		margin-right:   7px;
		font-size:      10px;
		letter-spacing: 0.4px;
		border-radius:  5px;

		&--warm {
			color:      #92600a;
			background: #fff3d6;
		}

		&--biz {
			color:      var(--crm-blue);
			background: var(--crm-blue-bg);
		}

		&--emp {
			color:      #be1866;
			background: #fde8f1;
		}
	}
}
</style>
