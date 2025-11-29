import React, { ButtonHTMLAttributes } from 'react';
import './MistbornButton.css';

interface MistbornButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

export const MistbornButton: React.FC<MistbornButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled = false,
  ...props
}) => {
  const classNames = [
    'mistborn-button',
    `mistborn-button-${variant}`,
    fullWidth ? 'mistborn-button-full' : '',
    disabled ? 'mistborn-button-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classNames} disabled={disabled} {...props}>
      <span className="mistborn-button-content">{children}</span>
    </button>
  );
};
