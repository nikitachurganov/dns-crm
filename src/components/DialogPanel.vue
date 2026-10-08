<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue';
import {BaseUiButton, SIZE, VARIANT} from '@dns-modules/base-ui-button';
import {useCrmStore} from '../stores/crm';
import {longTime, shortTime, shortTopic, starStr, timePart} from '../utils/format';
import AiCard from './AiCard.vue';
import CloseWidget from './CloseWidget.vue';
import DialogComposer from './DialogComposer.vue';
import UserAvatar from './UserAvatar.vue';

import '@dns-modules/base-ui-button/style.css';

/**
 * Диалог: шапка активного sub-чата, лента сообщений, AI-карточка, композер
 */

const store    = useCrmStore();
const listRef  = ref<HTMLElement | null>(null);

const messages = computed(() => store.messagesOf(store.ticketId));

/** Индекс сообщения, после которого показывается AI-карточка (только в открытых тикетах) */
const aiIndex = computed(() => {
	if (store.isClosed) {
		return -1;
	}

	const list        = messages.value;
	const hasOperator = list.some((m) => 'operator' === m.sender);
	const idx         = list.findIndex((m) => 'client' === m.sender);

	if (-1 === idx) {
		return -1;
	}

	const laterClient = list.slice(idx + 1).some((m) => 'client' === m.sender);

	return !laterClient || !hasOperator ? idx : -1;
});

watch(
	() => [store.ticketId, messages.value.length, store.ticket?.closureReq, store.ticket?.saidYes],
	async () => {
		await nextTick();
		if (listRef.value) {
			listRef.value.scrollTop = listRef.value.scrollHeight;
		}
	},
	{immediate: true, flush: 'post'},
);
</script>

<template>
	<section v-if="store.chat && store.ticket" class="dialog">
		<div class="dialog__head">
			<user-avatar :name="store.client?.name" />
			<div class="dialog__title">
				<h3>{{ store.client?.name }} · {{ shortTopic(store.ticket.topic).toLowerCase() }}</h3>
				<div class="dialog__sub">
					<span class="dialog__dot" :class="{'dialog__dot--on': '1' === store.chat.online}" />
					{{ '1' === store.chat.online ? 'онлайн' : 'не в сети' }} · тикет {{ store.ticket.ticket_id }}<template v-if="store.ticket.order_id"> · заказ {{ store.ticket.order_id }}</template>
				</div>
			</div>
			<div class="dialog__actions">
				<base-ui-button :variant="VARIANT.secondary" :size="SIZE.small" :disabled="store.isClosed" @click="store.runAction('transfer')">
					Перевести на другого оператора / линию
				</base-ui-button>
				<base-ui-button :variant="VARIANT.secondary" :size="SIZE.small" :disabled="store.isClosed" @click="store.runAction('service')">
					Создать заявку в СЦ
				</base-ui-button>
				<base-ui-button
					:size="SIZE.small"
					:disabled="store.isClosed || store.ticket.closureReq"
					@click="store.requestClosure()"
				>
					Вопрос решён
				</base-ui-button>
			</div>
		</div>

		<div ref="listRef" class="dialog__msgs">
			<template v-for="(m, idx) in messages" :key="m.message_id">
				<div v-if="'system' === m.sender && 'event' === m.type" class="sys-event">
					{{ m.text }} · {{ timePart(m.ts) || m.ts.split(' ')[0] }}
				</div>
				<div v-else-if="'system' === m.sender" class="sys-action">{{ m.text }}</div>
				<div
					v-else
					class="bubble"
					:class="['client' === m.sender ? 'bubble--client' : 'bubble--op', {'bubble--attach': 'attachment' === m.type}]"
				>
					<span v-if="'attachment' === m.type" class="bubble__clip">📎</span>{{ m.text }}
					<span class="bubble__time">
						{{ timePart(m.ts) || shortTime(m.ts) }}<span v-if="'operator' === m.sender" class="bubble__ticks"> ✓✓</span>
					</span>
				</div>
				<ai-card v-if="idx === aiIndex" />
			</template>

			<div v-if="store.isClosed" class="closure">
				✔ Клиент подтвердил: <b>проблема решена</b><br>
				<span class="closure__stars">{{ starStr(store.ticket.csat) }}</span>
				<template v-if="store.ticket.csat"> {{ store.ticket.csat }} / 5</template>
				<div class="closure__dim">
					Тикет закрыт клиентом · {{ longTime(store.ticket.date) }}<template v-if="'1' === store.ticket.fcr"> · решено с первого контакта (FCR)</template>
				</div>
			</div>

			<close-widget v-if="!store.isClosed && store.ticket.closureReq" :ticket="store.ticket" />
		</div>

		<dialog-composer />
	</section>
	<section v-else class="dialog dialog--empty">Выберите чат слева</section>
</template>

<style scoped lang="scss">
.dialog {
	display:        flex;
	flex:           1;
	flex-direction: column;
	min-width:      0;
	min-height:     0;

	&--empty {
		align-items:     center;
		justify-content: center;
		color:           var(--crm-ink3);
	}

	&__head {
		display:       flex;
		flex:          none;
		gap:           12px;
		align-items:   center;
		padding:       10px 18px;
		background:    var(--crm-panel);
		border-bottom: 1px solid var(--crm-line);
	}

	&__title {
		flex:      1;
		min-width: 0;

		h3 {
			margin:    0;
			font-size: 16px;
		}
	}

	&__actions {
		display:     flex;
		flex:        none;
		flex-wrap:   wrap;
		gap:         8px;
		justify-content: flex-end;
		max-width:   55%;
	}

	&__sub {
		display:     flex;
		gap:         6px;
		align-items: center;
		margin-top:  2px;
		font-size:   13px;
		color:       var(--crm-ink2);
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
		gap:            10px;
		padding:        18px 22px;
		overflow-y:     auto;
	}
}

.sys-event {
	align-self:    center;
	padding:       4px 12px;
	font-size:     12px;
	color:         var(--crm-ink3);
	background:    #e8ecf2;
	border-radius: 20px;
}

.sys-action {
	align-self:    center;
	max-width:     78%;
	padding:       8px 14px;
	font-size:     13px;
	color:         #14532d;
	text-align:    center;
	background:    var(--crm-green-bg);
	border:        1px solid #bfe8cc;
	border-radius: 10px;
}

.bubble {
	position:      relative;
	max-width:     62%;
	padding:       10px 13px;
	font-size:     14px;
	line-height:   1.45;
	border-radius: 14px;
	box-shadow:    0 1px 2px rgba(16, 24, 40, 0.05);

	&--client {
		align-self:                  flex-start;
		background:                  var(--crm-panel);
		border:                      1px solid var(--crm-line);
		border-bottom-left-radius:   5px;
	}

	&--op {
		align-self:                  flex-end;
		background:                  #ffe9d6;
		border:                      1px solid #ffd9b8;
		border-bottom-right-radius:  5px;
	}

	&--attach {
		background: var(--crm-yellow-bg);
		border:     1px solid #f3e2a8;
	}

	&__clip {
		margin-right: 5px;
	}

	&__time {
		display:    block;
		margin-top: 5px;
		font-size:  11px;
		color:      var(--crm-ink3);
	}

	&--op &__time {
		text-align: right;
	}

	&__ticks {
		color: var(--crm-blue);
	}
}

.closure {
	align-self:    center;
	max-width:     80%;
	padding:       10px 16px;
	font-size:     14px;
	color:         #14532d;
	text-align:    center;
	background:    var(--crm-green-bg);
	border:        1px solid #bfe8cc;
	border-radius: 12px;

	&__stars {
		font-size:      16px;
		letter-spacing: 2px;
		color:          var(--crm-star);
	}

	&__dim {
		margin-top: 3px;
		font-size:  12px;
		color:      #5b8a6b;
	}
}
</style>
