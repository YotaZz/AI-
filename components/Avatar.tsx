import React from 'react';
import { Character } from '../types';

interface AvatarProps {
  character: Character;
  isActive: boolean;
  size?: 'sm' | 'md' | 'lg';
  modelName?: string;
}

const Avatar: React.FC<AvatarProps> = ({ character, isActive, size = 'md', modelName }) => {
  const sizeClasses = {
    // 电脑端稍微调大 Observer (sm) 的尺寸
    sm: 'w-12 h-12 lg:w-20 lg:h-20', 
    md: 'w-16 h-16 md:w-20 md:h-20 lg:w-28 lg:h-28', 
    lg: 'w-24 h-24'
  };

  return (
    <div className={`relative flex flex-col items-center transition-all duration-500 ${isActive ? 'scale-110 -translate-y-2 lg:translate-y-0 lg:scale-105' : 'opacity-70 grayscale-[0.5]'}`}>
      <div className={`rounded-full border-2 lg:border-[3px] overflow-hidden ${sizeClasses[size]} ${character.borderColor} ${isActive ? 'shadow-[0_0_15px_rgba(255,255,255,0.3)]' : ''} bg-black transition-all duration-500`}>
        <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
      </div>
      
      {isActive && (
        <div className={`absolute -bottom-1 w-2 h-2 lg:w-3 lg:h-3 rounded-full ${character.color.replace('text-', 'bg-')} animate-ping`} />
      )}
      
      {/* 调整：名字字号变大 */}
      <span className={`mt-2 text-sm lg:text-lg font-bold font-serif uppercase tracking-wider ${character.color} bg-black/50 px-2 py-0.5 rounded whitespace-nowrap`}>
        {character.name}
      </span>
      
      {/* 调整：模型名字号变大 */}
      <span className="text-xs lg:text-sm text-parchment-200/50 uppercase tracking-tighter mt-1 hidden sm:block">
        {modelName || character.model}
      </span>
    </div>
  );
};

export default Avatar;