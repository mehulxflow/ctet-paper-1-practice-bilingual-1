import DOMPurify from 'dompurify';
import { memo, useMemo } from 'react';

interface RichContentProps {
  html: string;
  className?: string;
  lang?: string;
  inline?: boolean;
}

const ALLOWED_TAGS = [
  'a',
  'b',
  'br',
  'div',
  'em',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
  'math',
  'semantics',
  'mrow',
  'mfrac',
  'mn',
  'mo',
  'mi',
  'msup',
  'msub',
  'msubsup',
  'msqrt',
  'mroot',
  'mstyle',
  'mspace',
  'mtext',
  'mtable',
  'mtr',
  'mtd',
  'annotation',
];

const ALLOWED_ATTR = [
  'alt',
  'aria-hidden',
  'class',
  'colspan',
  'encoding',
  'href',
  'rel',
  'rowspan',
  'src',
  'style',
  'target',
  'xmlns',
];

export const RichContent = memo(function RichContent({
  html,
  className = '',
  lang,
  inline = false,
}: RichContentProps) {
  const sanitized = useMemo(() => {
    if (!html) return '';
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    });
  }, [html]);

  const Tag = inline ? 'span' : 'div';
  return (
    <Tag
      lang={lang}
      className={`ctet-rich-html ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
});
