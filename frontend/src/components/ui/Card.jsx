const Card = ({ className = '', as: Tag = 'div', ...props }) => (
    <Tag
        className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}
        {...props}
    />
);

export default Card;

