<script setup lang="ts">
import {CounterBadge} from '@dns-modules/badge';
import {SIZES, Tab, TabList} from '@dns-modules/base-ui-tabs';
import {useCrmStore} from '../stores/crm';
import type {ChatFilter} from '../types';
import {datePart, shortName, shortTime, shortTopic, TODAY} from '../utils/format';
import UserAvatar from './UserAvatar.vue';

import '@dns-modules/badge/style.css';
import '@dns-modules/base-ui-tabs/style.css';

/**
 * Очередь чатов: поиск, фильтры и раскрывающиеся sub-чаты по тикетам
 */

const store = useCrmStore();

const TABS: {id: ChatFilter; title: string}[] = [
	{id: 'active', title: 'Активные'},
	{id: 'waiting', title: 'Ждут'},
	{id: 'all', title: 'Все'},
];

/** Количество чатов в фильтре */
function countByFilter(id: ChatFilter) {
	return 'all' === id ? store.db.chats.length : store.db.chats.filter((c) => c.status === id).length;
}

/** Клик по чату: повторный клик по выбранному сворачивает/разворачивает sub-чаты */
function onChatClick(id: string) {
	if (id === store.chatId) {
		store.toggleExpanded(id);
	} else {
		store.selectChat(id);
	}
}

/** Подпись справа у sub-чата */
function subMeta(date: string) {
	return TODAY === datePart(date) ? 'сегодня' : datePart(date).slice(0, 5);
}
</script>

<template>
	<aside class="queue">
		<div class="queue__head">
			<h2 class="queue__title">Мои чаты</h2>
		</div>

		<tab-list class="queue__tabs" :tabs="TABS">
			<template #default="{id, title}">
				<tab
					:is-active="store.filter === id"
					:size="SIZES.small"
					@click="store.filter = id as ChatFilter"
				>
					{{ title }}
					<counter-badge
						class="queue__tab-count"
						has-outline
						:color="store.filter === id ? 'orange' : 'gray'"
					>
						{{ countByFilter(id as ChatFilter) }}
					</counter-badge>
				</tab>
			</template>
		</tab-list>

		<div class="queue__list">
			<div v-if="!store.queue.length" class="queue__empty">Нет чатов по фильтру</div>

			<template v-for="chat in store.queue" :key="chat.chat_id">
				<div
					class="chat"
					:class="{'chat--on': chat.chat_id === store.chatId}"
					@click="onChatClick(chat.chat_id)"
				>
					<user-avatar :name="store.clientOfChat(chat)?.name" :online="'1' === chat.online" />
					<div class="chat__meta">
						<div class="chat__row">
							<span class="chat__name">{{ shortName(store.clientOfChat(chat)?.name) }}</span>
							<span class="chat__time">{{ shortTime(store.lastMessage(chat.client_id)?.ts) }}</span>
						</div>
						<div class="chat__row">
							<span class="chat__preview">{{ store.lastMessage(chat.client_id)?.text }}</span>
							<counter-badge v-if="Number(chat.unread)">{{ chat.unread }}</counter-badge>
						</div>
					</div>
				</div>

				<div v-if="store.expanded[chat.chat_id]" class="subs">
					<div
						v-for="t in store.ticketsSorted(chat.client_id)"
						:key="t.ticket_id"
						class="sub"
						:class="{'sub--on': t.ticket_id === store.ticketId && chat.chat_id === store.chatId}"
						:title="t.topic"
						@click.stop="store.selectSub(chat.chat_id, t.ticket_id)"
					>
						<span class="sub__dot" :class="'решено' === t.status ? 'sub__dot--closed' : 'sub__dot--open'" />
						<span class="sub__title">{{ shortTopic(t.topic) }}</span>
						<span class="sub__meta">
							{{ subMeta(t.date) }}
						</span>
					</div>
				</div>
			</template>
		</div>
	</aside>
</template>

<style scoped lang="scss">
.queue {
	display:        flex;
	flex:           none;
	flex-direction: column;
	width:          300px;
	min-height:     0;
	background:     var(--crm-panel);
	border-right:   1px solid var(--crm-line);

	&__head {
		display:         flex;
		align-items:     center;
		justify-content: space-between;
		padding:         14px 16px 10px;
	}

	&__title {
		margin:    0;
		font-size: 16px;
	}

	&__tabs {
		padding: 0 8px 10px;
	}

	&__tab-count {
		margin-left: 6px;
	}

	&__tabs {
		gap: 4px;
	}

	&__tabs :deep(button) {
		padding-right: 8px;
		padding-left:  8px;
		font-size:     13px;
	}

	&__list {
		flex:       1;
		overflow-y: auto;
	}

	&__empty {
		padding:    30px 16px;
		text-align: center;
		color:      var(--crm-ink3);
	}
}

.chat {
	display:     flex;
	gap:         10px;
	align-items: flex-start;
	padding:     11px 14px;
	cursor:      pointer;
	border-left: 3px solid transparent;

	&:hover {
		background: var(--crm-bg);
	}

	&--on {
		background:        var(--crm-orange-soft);
		border-left-color: var(--crm-orange);
	}

	&__meta {
		flex:      1;
		min-width: 0;
	}

	&__row {
		display:         flex;
		align-items:     center;
		justify-content: space-between;
		gap:             6px;

		& + & {
			margin-top: 3px;
		}
	}

	&__name {
		font-weight: 700;
	}

	&__time {
		flex:      none;
		font-size: 12px;
		color:     var(--crm-ink3);
	}

	&__preview {
		flex:          1;
		overflow:      hidden;
		font-size:     13px;
		color:         var(--crm-ink2);
		white-space:   nowrap;
		text-overflow: ellipsis;
	}

}

.subs {
	padding:     2px 0 6px;
	background:  var(--crm-bg);
	border-left: 3px solid var(--crm-orange-line);
}

.sub {
	position:    relative;
	display:     flex;
	gap:         8px;
	align-items: center;
	padding:     7px 14px 7px 30px;
	font-size:   13px;
	color:       var(--crm-ink2);
	cursor:      pointer;

	&::before {
		content:    '';
		position:   absolute;
		top:        0;
		bottom:     0;
		left:       19px;
		width:      1.5px;
		background: var(--crm-line);
	}

	&:hover {
		background: var(--crm-line);
	}

	&--on {
		font-weight: 700;
		color:       var(--crm-ink);
		background:  var(--crm-orange-soft);

		&::before {
			background: var(--crm-orange);
		}
	}

	&__dot {
		flex:          none;
		width:         8px;
		height:        8px;
		border-radius: 50%;

		&--open {
			background: var(--crm-red);
		}

		&--closed {
			background: var(--crm-green);
		}
	}

	&__title {
		flex:          1;
		overflow:      hidden;
		white-space:   nowrap;
		text-overflow: ellipsis;
	}

	&__meta {
		flex:      none;
		font-size: 11px;
		color:     var(--crm-ink3);
	}

}
</style>
