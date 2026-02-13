import React from 'react';
import './ClanTag.css';

interface ClanTagProps {
  tag: string;
  size?: 'small' | 'medium' | 'large';
}

export const ClanTag: React.FC<ClanTagProps> = ({ tag, size = 'medium' }) => {
  if (!tag) return null;

  return (
    <span className={`clan-tag-badge clan-tag-${size}`}>
      [{tag}]
    </span>
  );
};
