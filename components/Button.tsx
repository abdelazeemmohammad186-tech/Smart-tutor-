import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  isLoading, 
  disabled,
  ...props 
}) => {
  const baseStyle = "font-bold rounded-2xl transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-400 hover:bg-blue-500 text-white border-b-4 border-blue-600 active:border-b-0 active:translate-y-1",
    secondary: "bg-green-400 hover:bg-green-500 text-white border-b-4 border-green-600 active:border-b-0 active:translate-y-1",
    accent: "bg-yellow-300 hover:bg-yellow-400 text-yellow-900 border-b-4 border-yellow-500 active:border-b-0 active:translate-y-1",
    outline: "bg-white text-gray-600 border-2 border-gray-200 hover:bg-gray-50",
    danger: "bg-red-400 text-white hover:bg-red-500 border-b-4 border-red-600 active:border-b-0 active:translate-y-1"
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-xl",
    xl: "px-10 py-6 text-2xl w-full",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};

export default Button;
