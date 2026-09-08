import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
export function Modal({
  title,
  subtitle,
  icon = 'flower',
  onClose,
  children,
  wide = false,
  dialogue = false,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  dialogue?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() =>
      ref.current?.querySelector<HTMLElement>('button, input, select, textarea, a[href]')?.focus(),
    );
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const nodes = ref.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
      );
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handler);
      previous?.focus();
      document.body.style.overflow = before;
    };
  }, [onClose, title]);
  return (
    <div
      className={`modal-backdrop ${dialogue ? 'rpg-backdrop' : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? 'modal-wide' : ''} ${dialogue ? 'rpg-dialogue' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={ref}
      >
        <button className="icon-button modal-close" aria-label="Close dialog" onClick={onClose}>
          <Icon name="close" />
        </button>
        <header className="modal-header">
          <div className="modal-emblem">
            <Icon name={icon} size={26} />
          </div>
          {subtitle && <span className="eyebrow">{subtitle}</span>}
          <h2 id="modal-title">{title}</h2>
        </header>
        {children}
      </div>
    </div>
  );
}
