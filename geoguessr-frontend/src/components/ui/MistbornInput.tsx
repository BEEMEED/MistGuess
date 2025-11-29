import React, { InputHTMLAttributes } from 'react';
import './MistbornInput.css';

interface MistbornInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const MistbornInput: React.FC<MistbornInputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className={`mistborn-input-wrapper ${className}`}>
      {label && <label className="mistborn-input-label">{label}</label>}
      <input
        className={`mistborn-input ${error ? 'mistborn-input-error' : ''}`}
        {...props}
      />
      {error && <span className="mistborn-input-error-text">{error}</span>}
    </div>
  );
};
