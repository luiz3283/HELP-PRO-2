import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '',
  ...props 
}) => {
  const baseStyle = "px-4 py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-95";
  
  const variants = {
    primary: "bg-urban-blue hover:bg-blue-700 text-white shadow-blue-900/20",
    secondary: "bg-urban-700 hover:bg-urban-800 text-gray-200 border border-urban-800",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    outline: "border-2 border-urban-blue text-urban-blue hover:bg-urban-blue/10"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
