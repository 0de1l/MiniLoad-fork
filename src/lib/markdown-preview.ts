import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';

type ElementNode = {
    tagName?: string;
    properties?: Record<string, unknown>;
};

export async function renderMarkdownPreviewHtml(markdown: string) {
    if (!markdown.trim()) {
        return '<p class="text-neutral-600 font-mono text-xs uppercase tracking-widest">Preview_Waiting_For_Input</p>';
    }

    const file = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(() => (tree) => {
            visit(tree, 'element', (node: unknown) => {
                const element = node as ElementNode;
                if (element.tagName !== 'a' || !element.properties?.href) return;

                const href = element.properties.href;
                if (typeof href === 'string' && (href.startsWith('http') || href.startsWith('//'))) {
                    element.properties.target = '_blank';
                    element.properties.rel = 'noopener noreferrer';
                }
            });
        })
        .use(rehypeSlug)
        .use(rehypeHighlight, { detect: false, ignoreMissing: true })
        .use(rehypeStringify)
        .process(markdown);

    return file.toString();
}
