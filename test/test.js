const assert = require("assert");
const {bar, clampPercent, resetIn, statusOf, sanitize, rows} = require("../src/dev.lyzev.opendeckgo.sdPlugin/plugin/util.js");

// percent clamping
assert.strictEqual(clampPercent(0), 0);
assert.strictEqual(clampPercent(50.5), 50.5);
assert.strictEqual(clampPercent(-3), 0);
assert.strictEqual(clampPercent(120), 100);
assert.strictEqual(clampPercent(NaN), 0);

// bar rendering across the full width
assert.strictEqual(bar(0), "░░░░░░░░");
assert.strictEqual(bar(100), "████████");
assert.strictEqual(bar(50), "████░░░░");
assert.strictEqual(bar(120), "████████");

// reset countdown formatting
const now = Date.UTC(2026, 0, 1, 12, 0);
assert.strictEqual(resetIn(new Date(now + 30 * 60000).toISOString(), now), "30m");
assert.strictEqual(resetIn(new Date(now + 90 * 60000).toISOString(), now), "2h");
assert.strictEqual(resetIn(new Date(now + 5 * 3600000).toISOString(), now), "5h");
assert.strictEqual(resetIn(new Date(now + 23 * 86400000).toISOString(), now), "23d");
assert.strictEqual(resetIn(new Date(now - 86400000).toISOString(), now), "0m");
assert.strictEqual(resetIn("bogus", now), "");
assert.strictEqual(resetIn(new Date(now + 1000).toISOString(), now), "0m");
assert.strictEqual(resetIn(new Date(now + 59999).toISOString(), now), "1m");

// status and sanitizing
assert.strictEqual(statusOf({status: "rate-limited"}), "rate-limited");
assert.strictEqual(statusOf({status: "ok"}), "ok");
assert.strictEqual(statusOf(undefined), "ok");
assert.strictEqual(sanitize("bad\tmess\u0007age!", 80), "badmessage!");
assert.strictEqual(sanitize("x".repeat(200), 60), "x".repeat(60));

// rows: malformed usage rejected, well-formed one mapped in order
assert.strictEqual(rows(null, now), null);
assert.strictEqual(rows({}, now), null);
assert.deepStrictEqual(rows({
    rolling: {status: "ok", percent: 25, resetsAt: new Date(now + 30 * 60000).toISOString()},
    weekly: {status: "ok", percent: 50, resetsAt: new Date(now + 3 * 86400000).toISOString()},
    monthly: {status: "rate-limited", percent: 100, resetsAt: new Date(now + 20 * 86400000).toISOString()},
}, now), [
    {label: "rolling", percent: 25, status: "ok", reset: "30m"},
    {label: "weekly", percent: 50, status: "ok", reset: "3d"},
    {label: "monthly", percent: 100, status: "rate-limited", reset: "20d"},
]);

console.log("all util tests passed");
