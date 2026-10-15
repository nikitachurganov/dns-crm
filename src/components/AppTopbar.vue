<script setup lang="ts">
import {ref} from 'vue';
import {FloatingMenuList, MenuItem, POSITIONS} from '@dns-modules/menu';
import {useCrmStore} from '../stores/crm';

import '@dns-modules/menu/style.css';

/**
 * Шапка сервиса по старой версии CRM: модули, разделы, пользователь и выход.
 * Разделы кроме чатов в прототипе не реализованы — переход показывает уведомление.
 */

type MenuId = 'modules' | 'feedback';

interface NavItem {
	id: string;
	label: string;
	/** Выпадающее меню раздела */
	menu?: MenuId;
}

const store = useCrmStore();

const MODULES = ['F-F'];
const CURRENT_MODULE = 'F-F';

const NAV: NavItem[] = [
	{id: 'operators', label: 'Операторы'},
	{id: 'feedback', label: 'Обратная связь', menu: 'feedback'},
	{id: 'bonus', label: 'Бонусная программа (ProZaPass)'},
];

/** Активный раздел — чаты находятся в «Обратной связи» */
const ACTIVE_NAV = 'feedback';

const FEEDBACK_ITEMS = ['Сообщения в обратную связь', 'Чаты'];
const CURRENT_FEEDBACK = 'Чаты';

const openMenu = ref<MenuId | null>(null);
const anchors  = ref<Partial<Record<MenuId, HTMLElement | null>>>({});

function setAnchor(id: MenuId, el: unknown) {
	anchors.value[id] = el as HTMLElement | null;
}

function toggle(id: MenuId) {
	openMenu.value = openMenu.value === id ? null : id;
}

/** Переход в раздел, которого нет в прототипе */
function notImplemented(label: string) {
	openMenu.value = null;
	store.toast(`Раздел «${label}» в прототипе не реализован`, 'info');
}

function pick(label: string, current: string) {
	if (label === current) {
		openMenu.value = null;
	} else {
		notImplemented(label);
	}
}
</script>

<template>
	<header class="topbar">
		<div class="topbar__bar">
			<span class="topbar__logo">crm</span>

			<button
				:ref="(el) => setAnchor('modules', el)"
				type="button"
				class="topbar__link"
				:aria-expanded="'modules' === openMenu"
				@click="toggle('modules')"
			>
				Модули ({{ CURRENT_MODULE }}) <span class="topbar__caret">▾</span>
			</button>

			<nav class="topbar__nav" aria-label="Разделы">
				<button
					v-for="item in NAV"
					:key="item.id"
					:ref="(el) => item.menu && setAnchor(item.menu, el)"
					type="button"
					class="topbar__link"
					:class="{'topbar__link--active': ACTIVE_NAV === item.id}"
					:aria-current="ACTIVE_NAV === item.id ? 'page' : undefined"
					:aria-expanded="item.menu ? item.menu === openMenu : undefined"
					@click="item.menu ? toggle(item.menu) : notImplemented(item.label)"
				>
					{{ item.label }}<span v-if="item.menu" class="topbar__caret">▾</span>
				</button>
			</nav>

			<div class="topbar__spacer" />

			<span class="topbar__user">Анна К.</span>
			<button type="button" class="topbar__link" @click="notImplemented('Выход')">Выйти</button>
		</div>

		<floating-menu-list
			v-if="'modules' === openMenu"
			:reference="anchors.modules ?? null"
			:position="POSITIONS.bottomStart"
			@close="openMenu = null"
		>
			<menu-item
				v-for="m in MODULES"
				:key="m"
				:has-arrow="false"
				:is-selected="CURRENT_MODULE === m"
				@click="pick(m, CURRENT_MODULE)"
			>
				<template #title>{{ m }}</template>
			</menu-item>
		</floating-menu-list>

		<floating-menu-list
			v-if="'feedback' === openMenu"
			:reference="anchors.feedback ?? null"
			:position="POSITIONS.bottomStart"
			@close="openMenu = null"
		>
			<menu-item
				v-for="f in FEEDBACK_ITEMS"
				:key="f"
				:has-arrow="false"
				:is-selected="CURRENT_FEEDBACK === f"
				@click="pick(f, CURRENT_FEEDBACK)"
			>
				<template #title>{{ f }}</template>
			</menu-item>
		</floating-menu-list>
	</header>
</template>

<style scoped lang="scss">
.topbar {
	flex: none;

	&__bar {
		display:     flex;
		gap:         4px;
		align-items: center;
		height:      48px;
		padding:     0 16px;
		color:       #cfd6e2;
		background:  var(--crm-navy);
	}

	&__logo {
		margin-right: 16px;
		font-size:    18px;
		font-weight:  700;
		color:        #fff;
	}

	&__nav {
		display:     flex;
		gap:         4px;
		align-items: center;
		margin-left: 12px;
	}

	&__link {
		display:       inline-flex;
		gap:           4px;
		align-items:   center;
		height:        32px;
		padding:       0 10px;
		font:          inherit;
		font-size:     16px;
		color:         #cfd6e2;
		white-space:   nowrap;
		cursor:        pointer;
		background:    transparent;
		border:        none;
		border-radius: 8px;
		transition:    background-color 0.2s, color 0.2s;

		&:hover {
			color:      #fff;
			background: rgba(255, 255, 255, 0.08);
		}

		&:focus-visible {
			outline: 1px solid #fff;
		}

		&--active {
			color:         #fff;
			box-shadow:    inset 0 -2px 0 var(--stroke-border-brand, #fc8507);
			border-radius: 8px 8px 0 0;
		}
	}

	&__caret {
		font-size: 14px;
	}

	&__spacer {
		flex: 1;
	}

	&__user {
		padding:   0 10px;
		font-size: 16px;
		color:     #fff;
	}


}
</style>
