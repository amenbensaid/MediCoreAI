const pad = (value) => String(value).padStart(2, '0');

const formatLocalDateTime = (value) => {
    if (!value) return value;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate())
    ].join('-') + 'T' + [
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds())
    ].join(':');
};

module.exports = {
    formatLocalDateTime
};
