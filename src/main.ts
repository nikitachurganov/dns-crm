import {createPinia} from 'pinia';
import {createApp} from 'vue';
import {createI18n} from 'vue-i18n';
import App from './App.vue';

import '@dns-modules/font-pt-sans/font-pt-sans.scss';
import '@dns-modules/font-icon/placeholders/placeholders.scss';
import '@dns-modules/font-icon/font-icon.scss';
// Стили компонентов-иконок (IconHorizontalDots и др.)
import '@dns-modules/font-icon/style.css';
// Иконки v3 (по макетам UFO DNSUI): data-image, action-send-message, action-close и др.
import '@dns-modules/font-icon-v3/font-icon.scss';
import './assets/design-tokens/tokens.css';
import './assets/style.scss';

// Компоненты dns-modules берут переводы через vue-i18n
const i18n = createI18n({
	locale:         'ru',
	fallbackLocale: 'en',
});

createApp(App).use(createPinia()).use(i18n).mount('#app');
