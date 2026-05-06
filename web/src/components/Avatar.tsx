import React from 'react';
import { getInitials } from '../utils/formatters';

interface AvatarProps {
  uri?: string;
  name: string;
  size?: number;
  onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 40, onClick }) => {
  const fontSize = Math.round(size * 0.36);
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize,
    cursor: onClick ? 'pointer' : 'default',
  };

  return (
    <div className="avatar" style={style} onClick={onClick}>
      {uri ? (
        <img src={uri} alt={name} />
      ) : (
        <div className="avatar-initials">
          {getInitials(name)}
        </div>
      )}
    </div>
  );
};
