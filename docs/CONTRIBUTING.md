# Разработка CRM

Прототип рабочего места оператора поддержки: очередь чатов, диалог с клиентом, панель деталей обращения.
Стек: Vue 3, Pinia, Vite, TypeScript, компоненты `@dns-modules/*`. Бэкенда нет — данные грузятся из демо-CSV или из CSV-файлов, которые оператор добавляет через интерфейс.

## Окружение

- Node.js 20.19+ (требование Vite 7).
- Пакеты `@dns-modules/*` ставятся из внутреннего реестра, он указан в `.npmrc`: `https://nexus.dns-shop.ru/repository/npm-reg-group/`. Нужен доступ к сети DNS; без него `npm install` не пройдёт.
- Переменных окружения и `.env` нет.

```bash
npm install
npm run dev
```

Dev-сервер открывается на `http://localhost:5173/` (порт по умолчанию Vite; в `.claude/launch.json` превью ждёт именно его).

## Скрипты

<!-- AUTO-GENERATED: из package.json, раздел scripts -->

| Команда | Что делает |
|---------|------------|
| `npm run dev` | Dev-сервер Vite с горячей перезагрузкой |
| `npm run build` | Проверка типов (`vue-tsc -b`) и production-сборка (`vite build`) |
| `npm run preview` | Локальный просмотр production-сборки |
| `npm run ts:check` | Только проверка типов (`vue-tsc -b`) |

<!-- /AUTO-GENERATED -->

Тестов и линтера в проекте нет. Минимальная проверка перед коммитом: `npm run ts:check`, затем визуально в браузере.

## Структура

| Путь | Назначение |
|------|------------|
| `src/App.vue` | Каркас: верхняя панель, очередь, диалог, правая панель, модальные окна |
| `src/stores/crm.ts` | Pinia-хранилище: данные, выбранный чат/тикет, все действия оператора |
| `src/types.ts` | Типы таблиц выгрузки (`Client`, `Order`, `Ticket`, `Chat`, `Message`) |
| `src/data/demo.ts` | Демо-данные в формате CSV (`DEMO_CSV`) |
| `src/data/templates.ts` | Шаблонные ответы оператора (`REPLY_TEMPLATES`) |
| `src/utils/` | Разбор CSV, форматирование, распознавание намерения, канцелярит-детектор |
| `src/components/` | Компоненты интерфейса; `chat-menu/`, `message-input/`, `icons/` — группы связанных компонентов |
| `src/assets/style.scss` | Общие стили и переменные `--crm-*` |

## Формат данных

Хранилище собирается из пяти таблиц. Каждая — CSV с заголовком; тип таблицы определяется по колонкам (`src/utils/csv.ts`). Недостающие необязательные колонки читаются как пустые значения, так что старые выгрузки продолжают загружаться. Даты — `ДД.ММ.ГГГГ`, время — `ЧЧ:мм`.

| Таблица | Колонки |
|---------|---------|
| `clients` | `client_id, name, phone, email, city, segment, status, channel, fav_store, pickup_method, timezone, bonus, prozapass_until, client_since, orders_count, ltv, avg_csat, tickets_count` |
| `orders` | `order_id, client_id, date, items, sku, amount, status, delivery, channel`, необязательные `address`, `prices` |
| `tickets` | `ticket_id, client_id, order_id, date, topic, category, status, operator, csat, fcr`, необязательная `priority` (`high`, `medium`, `low`) |
| `chats` | `chat_id, client_id, status, unread, assigned_to, channel, online` |
| `messages` | `message_id, ticket_id, ts, sender, type, text`, необязательные `author`, `author_email` |

Сообщения (`messages`):

- `sender`: `client`, `operator` или `system`.
- `type`: `text`, `attachment`, а у системных — `event` (серая плашка), `action` (зелёная плашка) и `assign` (разделитель передачи обращения).
- Передача тикета другому оператору: сообщения прошлого оператора идут первыми, у них заполнены `author` и `author_email`. Затем строка `system,assign,<текст тега>` — пунктирный разделитель с тегом. Дальше идут сообщения текущего оператора с пустыми `author`/`author_email`. Над сообщениями каждого прошлого оператора показывается плашка с его именем и почтой, она «прилипает» к верху ленты до конца его блока.
- Порядок сообщений в ленте — порядок строк в таблице, а не `ts`.

## Стиль кода

Правила выведены из существующего кода — держитесь их:

- Отступы — табы; двоеточия в объектах и CSS-свойствах выравниваются по колонке.
- Сравнения в стиле `'value' === variable` (константа слева).
- Компоненты — `<script setup lang="ts">`, стили — `scoped` SCSS с БЭМ-именами (`block__element--modifier`).
- Комментарии и JSDoc — на русском, поясняют «почему», а не «что».
- Цвета и размеры — через токены `--crm-*` и `--background-*`/`--text-*` из `@dns-modules`, с запасным значением, например `var(--background-neutral-light, #eee)`.
- Иконки — из `@dns-modules/font-icon` (v2) и `@dns-modules/font-icon-v3` (псевдоним на v3).

## Чек-лист перед PR

- [ ] `npm run ts:check` проходит без ошибок.
- [ ] Изменение проверено в браузере (`npm run dev`), в консоли нет ошибок.
- [ ] Если менялся формат данных — обновлены `src/types.ts`, `src/data/demo.ts` и таблица выше.
