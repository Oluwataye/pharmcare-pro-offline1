import React, { forwardRef } from 'react';
import { LucideProps } from 'lucide-react';

export const NairaSign = forwardRef<SVGSVGElement, LucideProps>(
    ({ size = 24, color = 'currentColor', strokeWidth = 2, ...props }, ref) => {
        return (
            <svg
                ref={ref}
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                {...props}
            >
                <path d="M6 3v18" />
                <path d="M18 3v18" />
                <path d="m6 21 12-18" />
                <path d="M5 10h14" />
                <path d="M5 14h14" />
            </svg>
        );
    }
);

NairaSign.displayName = 'NairaSign';
