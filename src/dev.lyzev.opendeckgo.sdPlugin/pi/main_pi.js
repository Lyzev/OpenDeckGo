let websocket = null, uuid = null;

function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
    uuid = inPropertyInspectorUUID;
    websocket = new WebSocket("ws://localhost:" + inPort);
    websocket.onopen = function () {
        let json = {
            event: inRegisterEvent, uuid: inPropertyInspectorUUID,
        };
        websocket.send(JSON.stringify(json));
        json = {
            event: "getSettings", context: uuid,
        };
        websocket.send(JSON.stringify(json));
    };
    websocket.onmessage = function (evt) {
        const jsonObj = JSON.parse(evt.data);
        if (jsonObj.event === "didReceiveSettings") {
            const payload = jsonObj.payload.settings;
            setElement("apiKey", payload.apiKey);
            setElement("metric", payload.metric, "rolling");
            setElement("frequency", payload.frequency, 900000);
            const el = document.querySelector(".sdpi-wrapper");
            el && el.classList.remove("hidden");
        }
    };
}

function setElement(element, value, fallback = "") {
    if (typeof value === "undefined") {
        document.getElementById(element).value = fallback;
        return;
    }
    document.getElementById(element).value = value;
}

function updateSettings() {
    if (websocket && websocket.readyState === 1) {
        let payload = {};
        payload.apiKey = document.getElementById("apiKey").value;
        payload.metric = document.getElementById("metric").value;
        payload.frequency = document.getElementById("frequency").value;
        const json = {
            event: "setSettings", context: uuid, payload: payload,
        };
        websocket.send(JSON.stringify(json));
    }
}

function openPage(site) {
    if (websocket && websocket.readyState === 1) {
        const json = {
            event: "openUrl", payload: {
                url: `https://${site}`,
            },
        };
        websocket.send(JSON.stringify(json));
    }
}
