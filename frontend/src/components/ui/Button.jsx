export const Button = ({
    variant = 'primary',
    className = '',
    as: Tag = 'button',
    ...props
}) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';
    const styles = {
        primary: 'rounded-2xl bg-slate-950 px-7 py-4 text-white hover:bg-slate-800',
        blue: 'rounded-2xl bg-blue-600 px-7 py-4 text-white shadow-lg shadow-blue-200 hover:bg-blue-700',
        ghost: 'rounded-2xl border border-slate-200 bg-white px-7 py-4 text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50',
        link: 'rounded-xl px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50'
    };

    return (
        <Tag className={`${base} ${styles[variant] || styles.primary} ${className}`} {...props} />
    );
};

