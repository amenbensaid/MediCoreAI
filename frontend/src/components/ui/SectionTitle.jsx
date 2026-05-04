const SectionTitle = ({ eyebrow, title, description, align = 'left' }) => {
    const isCenter = align === 'center';
    return (
        <div className={`${isCenter ? 'text-center' : 'text-left'} space-y-2`}>
            {eyebrow && (
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                    {eyebrow}
                </p>
            )}
            {title && (
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                    {title}
                </h2>
            )}
            {description && (
                <p className="text-slate-600">
                    {description}
                </p>
            )}
        </div>
    );
};

export default SectionTitle;

