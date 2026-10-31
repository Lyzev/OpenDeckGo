let websocket = null, pluginUUID = null;
const buttons = [];
const timers = new Map();
const metrics = new Map();
const USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
const sendWs = (data) => websocket.send(JSON.stringify(data));

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
    pluginUUID = inPluginUUID;
    websocket = new WebSocket(`ws://localhost:${inPort}`);

    websocket.onopen = () => sendWs({event: inRegisterEvent, uuid: inPluginUUID});

    websocket.onmessage = (evt) => {
        const jsonObj = JSON.parse(evt.data);
        const {event, context} = jsonObj;

        if (event === "willAppear") {
            // replace any existing entry so re-added keys don't draw twice
            const i = buttons.findIndex(b => b.context === context);
            if (i !== -1) buttons[i] = {context, jsonObj};
            else buttons.push({context, jsonObj});
            refresh(jsonObj, context);
        } else if (event === "willDisappear") {
            clearInterval(timers.get(context));
            timers.delete(context);
            metrics.delete(context);
            const i = buttons.findIndex(b => b.context === context);
            if (i !== -1) buttons.splice(i, 1);
        } else if (event === "keyUp" || event === "didReceiveSettings") refresh(jsonObj, context);
    };
}

function refresh(jsonObj, context) {
    const s = jsonObj.payload?.settings;
    const valid = s && ["apiKey", "frequency", "metric"].every(k => k in s);
    const frequency = valid && s.frequency !== "0" ? parseInt(s.frequency) : false;

    if (!valid || !s.apiKey) {
        sendWs({event: "showAlert", context: jsonObj.context});
        return;
    }
    // everything is canvas-drawn; make sure no native title overlaps it
    sendWs({event: "setTitle", context, payload: {title: ""}});
    sendRequest(context, s.apiKey, s.metric);
    clearInterval(timers.get(context));
    if (frequency) timers.set(context, setInterval(() => sendRequest(context, s.apiKey, s.metric), frequency));
}

async function fetchUsage(apiKey, context, callback) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let res;
    try {
        res = await fetch(USAGE_URL, {headers: {authorization: `Bearer ${apiKey}`}, signal: controller.signal});
    } catch {
        clearTimeout(timer);
        sendWs({event: "showAlert", context});
        showError(context, "offline or timeout");
        return;
    }
    // json read inside the same timeout window: a stalled body must not hang forever
    const json = await res.json().catch(() => null);
    clearTimeout(timer);
    if (!res.ok) {
        const err = json?.error?.code === "api_key_expired" ? "key expired, renew at opencode.ai/console"
            : `HTTP ${res.status} ${util.sanitize(json?.error?.message ?? "", 60)}`;
        sendWs({event: "showAlert", context});
        showError(context, err);
        return;
    }
    const usage = json?.usage;
    if (!usage) {
        sendWs({event: "showAlert", context});
        showError(context, "unexpected response");
    } else callback(usage);
}

function sendRequest(context, apiKey, metric) {
    metrics.set(context, metric);
    fetchUsage(apiKey, context, usage => draw(usage, context));
}
const COLOR_OK = "#2ecc71", COLOR_BAD = "#e74c3c", COLOR_TRACK = "#334155", COLOR_MUTED = "#94a3b8";

const colorOf = row => row.status === "rate-limited" || row.percent >= 100 ? COLOR_BAD : COLOR_OK;
// Compact keys draw their own labels, so their native title stays empty.
const METRICS_TITLE = {rolling: "Rolling", weekly: "Weekly", monthly: "Monthly"};

function draw(usage, context) {
    const r = util.rows(usage, Date.now());
    if (!r) {
        sendWs({event: "showAlert", context});
        showError(context, "unexpected response");
        return;
    }
    const metric = metrics.get(context) || "rolling";
    if (metric === "all") drawCompact(r, context);
    else drawSingle(r[rowMetricIndex(metric)], context);
}

const METRICS = ["rolling", "weekly", "monthly"];
const rowMetricIndex = metric => Math.max(0, METRICS.indexOf(metric));

function showError(context, message) {
    // 144x144 key: render the message wrapped, plus the alert sound/event.
    const lines = String(message).match(/.{1,18}(\s|$)|\S+/g) || ["error"];
    drawTextTitle("error", lines.slice(0, 5), COLOR_BAD, context);
}

// Single-metric key: percent, bar, reset inside it, metric name under it.
function drawSingle(row, context) {
    const canvas = document.getElementById("idCanvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const c = colorOf(row);

    ctx.textAlign = "center";
    ctx.fillStyle = c;
    ctx.font = "bold 52px Arial";
    ctx.fillText(`${Math.round(row.percent)}%`, canvas.width / 2, 54);

    ctx.fillStyle = COLOR_TRACK;
    roundRect(ctx, 16, 70, 112, 24, 12);
    ctx.fill();
    ctx.fillStyle = c;
    roundRect(ctx, 16, 70, Math.max(24, Math.round(112 * row.percent / 100)), 24, 12);
    ctx.fill();

    // reset inside the bar: white reads on both the fill and the track
    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.fillText(`resets in ${row.reset || "?"}`, canvas.width / 2, 87);

    ctx.fillStyle = "white";
    ctx.font = "bold 22px Arial";
    ctx.fillText(METRICS_TITLE[metrics.get(context)] || "Rolling", canvas.width / 2, 122);

    sendWs({event: "setImage", context, payload: {image: canvas.toDataURL()}});
}

// All three metrics: three rows, each with label, reset, bar and percent.
function drawCompact(rows, context) {
    const canvas = document.getElementById("idCanvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    rows.forEach((row, i) => {
        const y = 6 + i * 46;
        const c = colorOf(row);

        ctx.textAlign = "left";
        ctx.fillStyle = "white";
        ctx.font = "bold 15px Arial";
        ctx.fillText(row.label, 6, y + 12);
        ctx.textAlign = "right";
        ctx.fillStyle = COLOR_MUTED;
        ctx.font = "bold 14px Arial";
        ctx.fillText(`in ${row.reset}`, 140, y + 12);

        // usage bar
        ctx.fillStyle = COLOR_TRACK;
        roundRect(ctx, 6, y + 20, 100, 14, 7);
        ctx.fill();
        ctx.fillStyle = c;
        roundRect(ctx, 6, y + 20, Math.max(14, Math.round(100 * row.percent / 100)), 14, 7);
        ctx.fill();

        ctx.fillStyle = c;
        ctx.font = "bold 15px Arial";
        ctx.fillText(`${Math.round(row.percent)}%`, 140, y + 32);
    });

    sendWs({event: "setImage", context, payload: {image: canvas.toDataURL()}});
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawTextTitle(title, lines, color, context) {
    const canvas = document.getElementById("idCanvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "left";
    ctx.font = "bold 14px Arial";
    ctx.fillText(title, 8, 20);
    ctx.font = "12px Arial";
    ctx.fillStyle = color;
    lines.forEach((line, i) => ctx.fillText(line, 8, 40 + i * 16));
    sendWs({event: "setImage", context, payload: {image: canvas.toDataURL()}});
}
