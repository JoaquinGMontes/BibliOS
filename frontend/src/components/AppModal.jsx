import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import './AppModal.css';

/**
 * Modal de confirmación/información con estilo BibliOS (tema oscuro, acentos dorados).
 * @param {boolean} open - Si el modal está visible
 * @param {() => void} onClose - Callback al cerrar o cancelar
 * @param {'success' | 'error' | 'confirm'} type - Tipo visual (éxito, error o confirmación)
 * @param {string} title - Título del modal
 * @param {string} message - Mensaje principal
 * @param {string} [detail] - Texto secundario opcional
 * @param {string} [buttonText='Aceptar'] - Texto del botón (modo un solo botón)
 * @param {string} [primaryButtonText] - Texto del botón principal (modo dos botones)
 * @param {string} [secondaryButtonText] - Texto del botón secundario (modo dos botones)
 * @param {() => void} [onPrimaryClick] - Al hacer clic en el botón principal (luego se llama onClose)
 */
function AppModal({
  open,
  onClose,
  type = 'success',
  title,
  message,
  detail,
  buttonText = 'Aceptar',
  primaryButtonText,
  secondaryButtonText = 'Cancelar',
  onPrimaryClick
}) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const isSuccess = type === 'success';
  const isConfirm = type === 'confirm' || (primaryButtonText && onPrimaryClick);

  const handlePrimary = () => {
    onPrimaryClick?.();
    onClose();
  };

  return (
    <div className="app-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="app-modal-title">
      <div className="app-modal-box" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="app-modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
        {type !== 'confirm' && (
          <div className={`app-modal-icon ${isSuccess ? 'app-modal-icon--success' : 'app-modal-icon--error'}`}>
            {isSuccess ? <CheckCircle size={48} /> : <AlertCircle size={48} />}
          </div>
        )}
        <h2 id="app-modal-title" className="app-modal-title">{title}</h2>
        <p className="app-modal-message">{message}</p>
        {detail && <p className="app-modal-detail">{detail}</p>}
        <div className={`app-modal-actions ${isConfirm ? 'app-modal-actions--two' : ''}`}>
          {isConfirm ? (
            <>
              <button type="button" className="app-modal-btn app-modal-btn--secondary" onClick={onClose}>
                {secondaryButtonText}
              </button>
              <button type="button" className="app-modal-btn" onClick={handlePrimary}>
                {primaryButtonText}
              </button>
            </>
          ) : (
            <button type="button" className="app-modal-btn" onClick={onClose}>
              {buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AppModal;
