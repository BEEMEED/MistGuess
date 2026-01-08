import React from 'react';
import { MistbornButton } from './MistbornButton';
import './MistbornModal.css';

interface MistbornModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'confirm' | 'alert' | 'danger';
  confirmText?: string;
  cancelText?: string;
  children?: React.ReactNode;
}

export const MistbornModal: React.FC<MistbornModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'confirm',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  children,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="mistborn-modal-overlay" onClick={onClose}>
      <div className="mistborn-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mistborn-modal__header">
          <h2 className="mistborn-modal__title">{title}</h2>
        </div>

        <div className="mistborn-modal__content">
          <p className="mistborn-modal__message">{message}</p>
          {children}
        </div>

        <div className="mistborn-modal__actions">
          {type !== 'alert' && (
            <MistbornButton variant="secondary" onClick={onClose}>
              {cancelText}
            </MistbornButton>
          )}
          <MistbornButton
            variant={type === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
          >
            {confirmText}
          </MistbornButton>
        </div>
      </div>
    </div>
  );
};
