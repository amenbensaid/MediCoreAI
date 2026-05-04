import { useMemo, useState } from 'react';
import { getAssetUrl } from '../../utils/assets';

const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-24 w-24 text-3xl',
    '2xl': 'h-32 w-32 text-4xl'
};

const radiusClasses = {
    full: 'rounded-full',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl'
};

const Avatar = ({
    src,
    firstName,
    lastName,
    name,
    alt = 'Avatar',
    size = 'md',
    radius = 'full',
    className = ''
}) => {
    const [imageFailed, setImageFailed] = useState(false);
    const imageUrl = useMemo(() => getAssetUrl(src), [src]);
    const initials = useMemo(() => {
        const parts = name ? String(name).trim().split(/\s+/) : [firstName, lastName];
        return parts
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => String(part).charAt(0).toUpperCase())
            .join('') || 'DR';
    }, [firstName, lastName, name]);

    return (
        <div className={`${sizeClasses[size] || sizeClasses.md} ${radiusClasses[radius] || radiusClasses.full} relative shrink-0 overflow-hidden bg-gradient-to-br from-primary-500 via-violet-500 to-medical-500 text-white shadow-sm ring-1 ring-white/40 dark:ring-dark-700 ${className}`}>
            {imageUrl && !imageFailed ? (
                <img
                    src={imageUrl}
                    alt={alt}
                    className="h-full w-full object-cover"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center font-semibold tracking-normal">
                    {initials}
                </div>
            )}
        </div>
    );
};

export default Avatar;
