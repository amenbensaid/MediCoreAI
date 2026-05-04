const Container = ({ className = '', as: Tag = 'div', ...props }) => (
    <Tag
        className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}
        {...props}
    />
);

export default Container;

