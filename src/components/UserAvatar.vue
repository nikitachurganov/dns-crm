<script setup lang="ts">
import {computed} from 'vue';
import {avatarColor, initials} from '../utils/format';

/**
 * Круглый аватар с инициалами и индикатором «онлайн»
 */

const props = withDefaults(defineProps<{
	name?: string;
	size?: number;
	online?: boolean;
}>(), {
	name:   '',
	size:   36,
	online: false,
});

const style = computed(() => ({
	width:      `${props.size}px`,
	height:     `${props.size}px`,
	fontSize:   `${Math.round(props.size * 0.36)}px`,
	background: avatarColor(props.name),
}));
</script>

<template>
	<span class="avatar" :style="style">
		{{ initials(name) }}
		<span v-if="online" class="avatar__online" />
	</span>
</template>

<style scoped lang="scss">
.avatar {
	position:        relative;
	display:         flex;
	flex:            none;
	align-items:     center;
	justify-content: center;
	border-radius:   50%;
	color:           #fff;
	font-weight:     700;

	&__online {
		position:      absolute;
		right:         -1px;
		bottom:        -1px;
		width:         10px;
		height:        10px;
		border-radius: 50%;
		background:    var(--crm-green);
		border:        2px solid var(--crm-panel);
	}
}
</style>
