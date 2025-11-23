import React from 'react';
import { Character } from '../types';

interface AvatarProps {
  character: Character;
  isActive: boolean;
  size?: 'sm' | 'md' | 'lg';
  modelName?: string; // Optional prop to override or display model
}

const Avatar: React.FC<AvatarProps> = ({ character, isActive, size = 'md', modelName }) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  return (
    <div className={`relative flex flex-col items-center transition-all duration-500 ${isActive ? 'scale-110 -translate-y-2' : 'opacity-70 grayscale-[0.5]'}`}>
      <div className={`rounded-full border-2 overflow-hidden ${sizeClasses[size]} ${character.borderColor} ${isActive ? 'shadow-[0_0_15px_rgba(255,255,255,0.3)]' : ''}`}>
        <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
      </div>
      {isActive && (
        <div className={`absolute -bottom-1 w-2 h-2 rounded-full ${character.color.replace('text-', 'bg-')} animate-ping`} />
      )}
      <span className={`mt-2 text-xs font-bold font-serif uppercase tracking-wider ${character.color} bg-black/50 px-2 py-0.5 rounded`}>
        {character.name}
      </span>
      {/* Display Model Name */}
      <span className="text-[10px] text-parchment-200/50 uppercase tracking-tighter mt-1">
        {modelName || character.model}
      </span>
    </div>
  );
};

export default Avatar;