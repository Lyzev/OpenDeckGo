// Pure helpers, shared between the plugin (browser) and the test (node).
let util;
(function () {
    const BAR_WIDTH = 8;

    // Clamp a percent and render it as a filled/empty bar.
    function bar(percent) {
        const p = clampPercent(percent);
        const filled = Math.round((p / 100) * BAR_WIDTH);
        return "#".repeat(filled) + "-".repeat(BAR_WIDTH - filled);
    }

    function clampPercent(percent) {
        if (!Number.isFinite(percent)) return 0;
        return Math.min(100, Math.max(0, percent));
    }

    // Human time until reset: "0m", "52m", "4h", "23d". "" on a bad date.
    function resetIn(resetsAt, now) {
        const minutes = Math.round((new Date(resetsAt).getTime() - now) / 60000);
        if (!Number.isFinite(minutes)) return "";
        if (minutes < 60) return `${Math.max(0, minutes)}m`;
        if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
        return `${Math.round(minutes / 1440)}d`;
    }

    // Green when inside the limit, red when rate-limited.
    function statusOf(item) {
        return item && item.status === "rate-limited" ? "rate-limited" : "ok";
    }

    // Server messages are outside our control: strip control chars, cap length.
    function sanitize(message, maxLen) {
        return String(message).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLen);
    }

    // One display row per window.
    function rows(usage, now) {
        if (!usage || !usage.rolling || !usage.weekly || !usage.monthly) return null;
        return [usage.rolling, usage.weekly, usage.monthly].map((item, i) => ({
            label: ["rolling", "weekly", "monthly"][i],
            percent: clampPercent(item.percent),
            status: statusOf(item),
            reset: resetIn(item.resetsAt, now),
        }));
    }

    if (typeof module === "object" && module.exports) module.exports = {bar, clampPercent, resetIn, statusOf, sanitize, rows};
    else util = {bar, clampPercent, resetIn, statusOf, sanitize, rows};
})();
