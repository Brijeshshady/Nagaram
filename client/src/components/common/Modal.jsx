import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HiX } from 'react-icons/hi';

/**
 * Universal NAGARAM Modal Component
 * - Mounts to document.body via Portal to avoid stacking context issues
 * - Locks body scroll without layout shift
 * - Global subtle backdrop blur: rgba(15, 23, 42, 0.32) + blur(4px)
 * - Accessible with role="dialog", aria-modal="true", and Escape-to-close
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  actions,
  size = 'md', // 'sm', 'md', 'lg', 'detail'
  showCloseButton = true,
  className = '',
  ariaLabelledBy = 'modal-heading',
}) => {
  const modalRef = useRef(null);

  // Lock body scroll and prevent layout shift
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  // Escape key handler to close modal
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = size ? `modal-card--${size}` : '';

  const modalContent = (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`modal-card ${sizeClass} ${className} animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="modal-header">
            <div>
              {title && (
                <h2 id={ariaLabelledBy} className="modal-title">
                  {title}
                </h2>
              )}
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
            {showCloseButton && onClose && (
              <button
                type="button"
                className="modal-close"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <HiX />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="modal-body">{children}</div>

        {/* Footer Actions */}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
