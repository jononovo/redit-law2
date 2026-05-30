function q(id) {
  return document.getElementById(id);
}

async function getOrMakeConnectionId() {
  const { connId } = await chrome.storage.local.get("connId");
  if (connId) return connId;
  const id = "sf-" + Math.random().toString(36).slice(2, 14);
  await chrome.storage.local.set({ connId: id });
  return id;
}

function refresh() {
  chrome.runtime.sendMessage({ type: "SF_STATUS" }, (s) => {
    void chrome.runtime.lastError;
    q("status").textContent = s && s.configured ? "Connected" : "Not connected";
    q("version").textContent = s ? s.version : "—";
  });
}

q("disconnect").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "SF_CLEAR" }, () => {
    void chrome.runtime.lastError;
    refresh();
  });
});

getOrMakeConnectionId().then((id) => {
  q("connid").textContent = id;
});
refresh();
