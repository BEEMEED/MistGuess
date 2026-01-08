import React, { HTMLAttributes } from 'react';
import './MistbornCard.css';

interface MistbornCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
}

export const MistbornCard: React.FC<MistbornCardProps> = ({
  children,
  hover = true,
  glow = false,
  className = '',
  ...props
}) => {
  const classNames = [
    'mistborn-card',
    hover ? 'mistborn-card-hover' : '',
    glow ? 'glow-effect' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
};
