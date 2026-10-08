import vue from '@vitejs/plugin-vue';
import {defineConfig} from 'vite';

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: [
			{
				// required for the dns-modules SCSS (~package imports)
				find:        /^~(.*)$/,
				replacement: '$1',
			},
		],
		extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
	},
});
