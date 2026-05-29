'use client';

interface LogoProps {
    className?: string;
    size?: number;
    color?: string;
}

export default function Logo({ className = "", size = 24, color }: LogoProps) {
    return (
        <img
            src="/vault-logo.svg"
            alt="WhisperVault Logo"
            width={size}
            height={size}
            className={className}
            style={{
                display: 'block',
                filter: color ? undefined : undefined,
                color: color || 'currentColor'
            }}
        />
    );
}




