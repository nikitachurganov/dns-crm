/**
 * Минимальный Markdown → HTML для заметок: заголовки, списки, цитаты, код, жирный, курсив и ссылки.
 * Сначала экранируем весь HTML, потом добавляем свою разметку, поэтому результат безопасен для v-html.
 */

const ESCAPES: Record<string, string> = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'};

function escapeHtml(source: string): string {
	return source.replace(/[&<>"]/g, (char) => ESCAPES[char] ?? char);
}

/** Строчная разметка внутри абзаца, пункта списка или заголовка */
function inline(source: string): string {
	return escapeHtml(source)
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
		.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

type BlockKind = 'p' | 'ul' | 'ol' | 'quote';

interface Block {
	kind: BlockKind;
	lines: string[];
}

function renderBlock(block: Block): string {
	const items = block.lines.map((line) => inline(line));

	switch (block.kind) {
		case 'ul':
			return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
		case 'ol':
			return `<ol>${items.map((item) => `<li>${item}</li>`).join('')}</ol>`;
		case 'quote':
			return `<blockquote>${items.join('<br>')}</blockquote>`;
		default:
			return `<p>${items.join('<br>')}</p>`;
	}
}

/** Markdown-текст заметки в безопасный HTML */
export function renderMarkdown(source: string): string {
	const html: string[] = [];
	let block: Block | null = null;
	let code: string[] | null = null;

	const flush = () => {
		if (block) {
			html.push(renderBlock(block));
			block = null;
		}
	};

	/** Добавляет строку в текущий блок того же вида или начинает новый */
	const push = (kind: BlockKind, line: string) => {
		if (block?.kind !== kind) {
			flush();
			block = {kind, lines: []};
		}

		block.lines.push(line);
	};

	for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
		if (/^```/.test(line)) {
			if (code) {
				html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
				code = null;
			} else {
				flush();
				code = [];
			}

			continue;
		}

		if (code) {
			code.push(line);

			continue;
		}

		const heading = /^(#{1,3})\s+(.*)$/.exec(line);
		const bullet  = /^\s*[-*]\s+(.*)$/.exec(line);
		const number  = /^\s*\d+\.\s+(.*)$/.exec(line);
		const quote   = /^>\s?(.*)$/.exec(line);

		if (heading) {
			// «#» — h3, «##» — h4, «###» — h5: заголовки в поповере небольшие
			const level = (heading[1] ?? '#').length + 2;

			flush();
			html.push(`<h${level}>${inline(heading[2] ?? '')}</h${level}>`);
		} else if (/^-{3,}$/.test(line.trim())) {
			flush();
			html.push('<hr>');
		} else if (bullet) {
			push('ul', bullet[1] ?? '');
		} else if (number) {
			push('ol', number[1] ?? '');
		} else if (quote) {
			push('quote', quote[1] ?? '');
		} else if ('' === line.trim()) {
			flush();
		} else {
			push('p', line);
		}
	}

	if (code) {
		html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
	}

	flush();

	return html.join('');
}
