import React from 'react';

interface TutorCharacterProps {
  emotion?: 'happy' | 'thinking' | 'talking';
  size?: 'sm' | 'md' | 'lg';
}

const TutorCharacter: React.FC<TutorCharacterProps> = ({ emotion = 'happy', size = 'md' }) => {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-32 h-32",
    lg: "w-48 h-48"
  };

  return (
    <div className={`relative ${sizeClasses[size]} mx-auto`}>
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl filter">
        {/* Head */}
        <circle cx="100" cy="100" r="90" fill="#60A5FA" className="animate-pulse-slow" />
        
        {/* Glasses */}
        <g stroke="#1E3A8A" strokeWidth="6" fill="white">
          <circle cx="70" cy="90" r="25" />
          <circle cx="130" cy="90" r="25" />
          <path d="M95 90 L105 90" strokeWidth="4" />
        </g>
        
        {/* Eyes */}
        <g fill="#1E3A8A">
          <circle cx="70" cy="90" r="8" className={emotion === 'thinking' ? 'translate-y-[-5px]' : ''} />
          <circle cx="130" cy="90" r="8" className={emotion === 'thinking' ? 'translate-y-[-5px]' : ''} />
        </g>

        {/* Mouth */}
        <path 
          d={emotion === 'talking' ? "M70 140 Q100 160 130 140" : "M70 140 Q100 150 130 140"}
          stroke="#1E3A8A" 
          strokeWidth="6" 
          fill="none" 
          strokeLinecap="round"
          className={emotion === 'talking' ? "animate-bounce" : ""}
        />

        {/* Hat (Optional Academic Cap) */}
        <path d="M40 50 L100 20 L160 50 L100 80 Z" fill="#1E40AF" />
        <path d="M160 50 V70" stroke="#FBBF24" strokeWidth="4" />
        <circle cx="160" cy="70" r="5" fill="#FBBF24" />
      </svg>
    </div>
  );
};

export default TutorCharacter;
