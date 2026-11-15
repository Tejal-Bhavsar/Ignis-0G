import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
  className = '',
  size = 'xs',
  title,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const sizeClass =
    size === 'sm'
      ? 'px-2.5 py-1.5 text-xs'
      : 'px-2 py-0.5 text-[10px]';

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title || `Copy ${label}`}
      className={`inline-flex items-center gap-1 rounded border font-mono font-medium transition ${sizeClass} ${
        copied
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-600 hover:border-[#0B3D91] hover:text-[#0B3D91]'
      } ${className}`}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}

