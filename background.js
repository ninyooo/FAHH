let globalLastActivity = Date.now();
const ports = new Set();

chrome.runtime.onConnect.addListener((port) => {
  ports.add(port);

  port.onMessage.addListener((msg) => {
    if (msg.type === "activity") {
      globalLastActivity = Date.now();
      for (const p of ports) {
        try {
          p.postMessage({ type: "lastActivity", value: globalLastActivity });
        } catch (e) {
          ports.delete(p);
        }
      }
    }
  });

  port.onDisconnect.addListener(() => {
    ports.delete(port);
  });
});
