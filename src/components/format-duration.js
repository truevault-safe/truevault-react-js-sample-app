const formatDuration = (seconds) => {
    const days = Math.floor(seconds / 3600 / 24);
    const hours = Math.floor(seconds / 3600) % 24;
    let formatted = '';
    if (days > 0) {
        formatted += `${days}d `;
    }
    return formatted + `${hours}h`;
}

module.exports = {formatDuration};
