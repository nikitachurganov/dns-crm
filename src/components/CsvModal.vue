<script setup lang="ts">
import {ref} from 'vue';
import {BaseUiButton, VARIANT} from '@dns-modules/base-ui-button';
import {Modal, SIZES} from '@dns-modules/modal';
import {useCrmStore} from '../stores/crm';
import type {CsvType} from '../types';

import '@dns-modules/base-ui-button/style.css';
import '@dns-modules/modal/style.css';

/**
 * Загрузка выгрузки из БД: clients / orders / tickets / chats / messages в CSV
 */

const store = useCrmStore();

const TYPE_RU: Record<CsvType, string> = {
	clients:  'клиенты',
	orders:   'заказы',
	tickets:  'обращения',
	chats:    'чаты',
	messages: 'сообщения',
};

const input = ref<HTMLInputElement | null>(null);
const isHot = ref(false);

function handle(files: FileList | null) {
	if (files) {
		store.loadCsvFiles([...files]);
	}
	if (input.value) {
		input.value.value = '';
	}
}

function onDrop(event: DragEvent) {
	isHot.value = false;
	handle(event.dataTransfer?.files ?? null);
}
</script>

<template>
	<modal v-if="store.isCsvOpen" has-cross :size="SIZES.md" @close="store.isCsvOpen = false">
		<template #title>Загрузка данных из базы (CSV)</template>

		<div class="modal-body csv">
			<div
				class="drop"
				:class="{'drop--hot': isHot}"
				@click="input?.click()"
				@dragover.prevent="isHot = true"
				@dragleave="isHot = false"
				@drop.prevent="onDrop"
			>
				Перетащите сюда CSV-файлы выгрузки<br>или <b>выберите файлы</b><br>
				<span class="drop__hint">clients.csv · orders.csv · tickets.csv · chats.csv · messages.csv</span>
			</div>
			<input
				ref="input"
				type="file"
				accept=".csv,text/csv"
				multiple
				hidden
				@change="handle(input?.files ?? null)"
			>

			<div class="results">
				<div v-for="(r, i) in store.csvResults" :key="i" class="file">
					<span :class="r.type ? 'file__ok' : 'file__err'">{{ r.type ? '✓' : '✕' }}</span>
					<span class="file__name">{{ r.fileName }}</span>
					<span class="file__what">
						<template v-if="r.type">{{ TYPE_RU[r.type] }} · {{ r.rows }} строк</template>
						<template v-else-if="r.error">ошибка разбора</template>
						<template v-else>не распознаны колонки</template>
					</span>
				</div>
			</div>

			<div class="note">
				Тип файла определяется по заголовкам колонок, имя файла не важно. Можно загрузить только часть файлов —
				остальные данные останутся прежними. Схему колонок смотрите в приложенных примерах.
			</div>
		</div>

		<template #footer="{close}">
			<div class="footer">
				<base-ui-button :variant="VARIANT.secondary" @click="store.restoreDemo()">Вернуть демо-данные</base-ui-button>
				<base-ui-button @click="close()">Готово</base-ui-button>
			</div>
		</template>
	</modal>
</template>

<style scoped lang="scss">
.csv {
	padding-bottom: 0;
}

.drop {
	padding:       26px 16px;
	font-size:     16px;
	color:         var(--crm-ink2);
	text-align:    center;
	cursor:        pointer;
	border:        2px dashed #c9d2de;
	border-radius: 12px;
	transition:    0.15s;

	&:hover,
	&--hot {
		background:   var(--crm-orange-soft);
		border-color: var(--crm-orange);
	}

	b {
		color: var(--crm-orange);
	}

	&__hint {
		font-size: 14px;
		color:     var(--crm-ink3);
	}
}

.results {
	display:        flex;
	flex-direction: column;
	gap:            6px;
	margin-top:     14px;
}

.file {
	display:       flex;
	gap:           9px;
	align-items:   center;
	padding:       8px 11px;
	font-size:     14px;
	background:    var(--crm-bg);
	border:        1px solid var(--crm-line);
	border-radius: 9px;

	&__ok {
		font-weight: 800;
		color:       var(--crm-green);
	}

	&__err {
		font-weight: 800;
		color:       var(--crm-red);
	}

	&__name {
		font-family: ui-monospace, Consolas, monospace;
		font-size:   14px;
	}

	&__what {
		margin-left: auto;
		font-size:   14px;
		color:       var(--crm-ink3);
	}
}

.note {
	padding:       9px 12px;
	margin-top:    14px;
	font-size:     14px;
	line-height:   1.45;
	color:         #1e3a8a;
	background:    var(--crm-blue-bg);
	border-radius: 9px;
}

.footer {
	display:         flex;
	gap:             10px;
	justify-content: flex-end;
}
</style>
