import React from 'react';

interface LogoIconProps {
  className?: string;
  size?: number | string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({
  className = '',
  size = 40,
}) => {
  return (
    <img
      src="/images/logo.svg"
      alt="RISKCLIM-MG Logo"
      width={size}
      height={size}
      className={`inline-block shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default LogoIcon;
