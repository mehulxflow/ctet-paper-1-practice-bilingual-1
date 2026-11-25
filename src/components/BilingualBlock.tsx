import type { BilingualText, LanguageMode } from '../types/ctet';
import { RichContent } from './RichContent';

interface BilingualBlockProps {
  text: BilingualText;
  langMode: LanguageMode;
  className?: string;
  enClassName?: string;
  hiClassName?: string;
  inline?: boolean;
  richHtml?: boolean;
}

function normalizeForCompare(str: string): string {
  return str.replace(/<[^>]+>/g, '').replace(/\s+/g, '').trim();
}

export function BilingualBlock({
  text,
  langMode,
  className = '',
  enClassName = '',
  hiClassName = '',
  inline = false,
  richHtml = false,
}: BilingualBlockProps) {
  const enVal = text.en || text.hi;
  const hiVal = text.hi || text.en;

  if (langMode === 'en') {
    return richHtml ? (
      <RichContent html={enVal} className={className} inline={inline} />
    ) : (
      <span className={className}>{enVal}</span>
    );
  }

  if (langMode === 'hi') {
    return richHtml ? (
      <RichContent html={hiVal} lang="hi" className={className} inline={inline} />
    ) : (
      <span lang="hi" className={className}>
        {hiVal}
      </span>
    );
  }

  const sameText = normalizeForCompare(enVal) === normalizeForCompare(hiVal);
  if (sameText) {
    return richHtml ? (
      <RichContent html={enVal} className={className} inline={inline} />
    ) : (
      <span className={className}>{enVal}</span>
    );
  }

  if (inline) {
    return (
      <span className={className}>
        {richHtml ? (
          <RichContent html={enVal} className={enClassName} inline />
        ) : (
          <span className={enClassName}>{enVal}</span>
        )}
        <span className="mx-1.5 text-slate-400" aria-hidden="true">
          /
        </span>
        {richHtml ? (
          <RichContent html={hiVal} lang="hi" className={hiClassName || 'text-slate-700'} inline />
        ) : (
          <span lang="hi" className={hiClassName || 'text-slate-700'}>
            {hiVal}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`block space-y-1.5 ${className}`}>
      {richHtml ? (
        <RichContent html={enVal} className={`block ${enClassName}`} />
      ) : (
        <span className={`block ${enClassName}`}>{enVal}</span>
      )}
      {richHtml ? (
        <RichContent
          html={hiVal}
          lang="hi"
          className={`block text-[0.94em] leading-relaxed ${hiClassName || 'text-slate-700'}`}
        />
      ) : (
        <span
          lang="hi"
          className={`block text-[0.94em] leading-relaxed ${hiClassName || 'text-slate-700'}`}
        >
          {hiVal}
        </span>
      )}
    </span>
  );
}
