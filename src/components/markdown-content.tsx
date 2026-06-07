'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

type MarkdownContentProps = {
  html: string;
  className?: string;
};

const MAX_HEIGHT = 400;

const LANGUAGE_LABELS: Record<string, string> = {
  plaintext: 'text',
  text: 'text',
  javascript: 'javascript',
  typescript: 'typescript',
  tsx: 'tsx',
  jsx: 'jsx',
  bash: 'bash',
  shell: 'bash',
  css: 'css',
  html: 'html',
  json: 'json',
  markdown: 'markdown',
  yaml: 'yaml',
  sql: 'sql',
  python: 'python'
};

function getCodeLanguage(pre: HTMLPreElement, code: HTMLElement) {
  const dataLanguage = pre.dataset.language;
  const classLanguage = Array.from(code.classList)
    .find((className) => className.startsWith('language-'))
    ?.replace('language-', '');
  const language = (dataLanguage || classLanguage || 'text').toLowerCase();
  return LANGUAGE_LABELS[language] ?? language;
}

const MarkdownContent = forwardRef<HTMLDivElement, MarkdownContentProps>(function MarkdownContent(
  { html, className = '' },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pres = Array.from(container.querySelectorAll<HTMLPreElement>('pre'));

    pres.forEach((pre) => {
      if (pre.closest('.code-block-wrapper')) return;

      const code = pre.querySelector('code');
      if (!code) return;
      const language = getCodeLanguage(pre, code);

      // 创建包装容器
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      pre.parentNode?.insertBefore(wrapper, pre);

      // 创建页眉
      const header = document.createElement('div');
      header.className = 'code-block-header';

      const languageLabel = document.createElement('span');
      languageLabel.className = 'code-block-language';
      languageLabel.textContent = language;

      const themeLabel = document.createElement('span');
      themeLabel.className = 'code-block-theme';
      themeLabel.textContent = 'Vitesse Dark';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'code-copy-btn';
      copyBtn.textContent = 'Playground';
      copyBtn.title = '复制代码';
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.textContent ?? '');
          copyBtn.textContent = 'Copied';
          copyBtn.setAttribute('data-copied', 'true');
          setTimeout(() => {
            copyBtn.textContent = 'Playground';
            copyBtn.removeAttribute('data-copied');
          }, 1500);
        } catch {
          copyBtn.textContent = 'Failed';
        }
      });

      header.appendChild(languageLabel);
      header.appendChild(themeLabel);
      header.appendChild(copyBtn);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);

      // 处理折叠逻辑
      requestAnimationFrame(() => {
        if (pre.scrollHeight > MAX_HEIGHT + 50) {
          wrapper.setAttribute('data-collapsed', 'true');

          const footer = document.createElement('div');
          footer.className = 'code-block-footer';

          const expandBtn = document.createElement('button');
          expandBtn.type = 'button';
          expandBtn.className = 'code-expand-btn';
          expandBtn.textContent = '展开全部';

          expandBtn.addEventListener('click', () => {
            const isCollapsed = wrapper.getAttribute('data-collapsed') === 'true';
            if (isCollapsed) {
              wrapper.setAttribute('data-collapsed', 'false');
              expandBtn.textContent = '收起代码';
              expandBtn.classList.add('is-expanded');
            } else {
              wrapper.setAttribute('data-collapsed', 'true');
              expandBtn.textContent = '展开全部';
              expandBtn.classList.remove('is-expanded');
              wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          });

          footer.appendChild(expandBtn);
          wrapper.appendChild(footer);
        }
      });
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

export default MarkdownContent;
