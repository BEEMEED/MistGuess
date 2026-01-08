import React from 'react';
import '../../styles/Avatar.css';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'User avatar',
  size = 'medium',
  onClick
}) => {
  const API_BASE_URL = 'http://localhost:8000';

  // Если нет аватарки, показываем дефолтную иконку
  const avatarUrl = src ? `${API_BASE_URL}/${src}` : null;

  return (
    <div
      className={`avatar avatar--${size}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={alt} className="avatar__image" />
      ) : (
        <div className="avatar__placeholder">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      )}
    </div>
  );
};
