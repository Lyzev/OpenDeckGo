// Standalone check: does the public usage endpoint accept your key?
// Usage: node test/usage-cli.js "<your opencode go api key>"
const {rows} = require("../src/dev.lyzev.opendeckgo.sdPlugin/plugin/util.js");

const key = process.argv[2];
if (!key) {
    console.error("usage: node test/usage-cli.js <api-key>   (get it at opencode.ai/console)");
    process.exit(1);
}

fetch("https://opencode.ai/zen/go/v1/usage", {headers: {authorization: `Bearer ${key}`}})
    .then(async res => {
        const json = await res.json().catch(() => null);
        if (!res.ok) {
            console.error(`HTTP ${res.status}: ${json?.error?.message ?? json?.error?.code ?? "<no body>"}`);
            process.exit(1);
        }
        const r = rows(json?.usage, Date.now());
        if (!r) {
            console.error("unexpected response:", JSON.stringify(json)?.slice(0, 300));
            process.exit(1);
        }
        for (const row of r) console.log(`${row.label.padEnd(8)} ${row.bar} ${row.percent}% ${(row.status === "rate-limited" ? "✕" : "✓")} resets in ${row.reset}`);
    })
    .catch(err => {
        console.error("request failed:", err.message);
        process.exit(1);
    });
