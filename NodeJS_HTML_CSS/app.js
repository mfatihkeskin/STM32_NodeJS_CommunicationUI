const { SerialPort } = require("serialport");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

// ─── Renk kodları ────────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

// ─── Ayarlar ──────────────────────────────────────────────────────────────────
const BAUD_RATE = 115200;
const FORCE_PORT = null;
const HTTP_PORT = 3000;

// ─── HTTP Server ──────────────────────────────────────────────────────────────
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const httpServer = http.createServer((req, res) => {
  const urlPath = req.url === "/" ? "/index.html" : req.url;
  const ext = path.extname(urlPath);
  const filePath = path.join(__dirname, urlPath);
  const mimeType = MIME_TYPES[ext] || "text/plain";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end(`Dosya bulunamadı: ${urlPath}`);
      return;
    }
    res.writeHead(200, { "Content-Type": mimeType });
    res.end(data);
  });
});

// ─── WebSocket Server ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });
let activePort = null; // Port referansı, sendStart için

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}

// UI'dan gelen komutları dinle
wss.on("connection", (ws) => {
  // Yeni bağlanan browser'a mevcut port durumunu hemen gönder
  const isOpen = activePort && activePort.isOpen;
  ws.send(
    JSON.stringify({
      type: "portStatus",
      connected: !!isOpen,
      port: isOpen ? activePort.path : null,
    }),
  );

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === "startTest") {
        sendStart();
      }
    } catch (e) {
      console.error(`${C.red}[WS HATA]${C.reset} Geçersiz mesaj:`, e.message);
    }
  });
});

// STM32'ye START komutu gönder
function sendStart() {
  if (!activePort || !activePort.isOpen) {
    console.warn(
      `${C.yellow}[UYARI] Port açık değil, START gönderilemedi.${C.reset}`,
    );
    broadcast({ type: "startAck", success: false, error: "Port açık değil" });
    return;
  }
  activePort.write("\rSTART\n", (err) => {
    if (err) {
      console.error(`${C.red}[WRITE HATA]${C.reset}`, err.message);
      broadcast({ type: "startAck", success: false, error: err.message });
    } else {
      console.log(
        `${C.cyan}[TX]${C.reset} ${C.bold}\\rSTART\\n${C.reset} → ${activePort.path}`,
      );
      broadcast({ type: "startAck", success: true });
    }
  });
}

httpServer.listen(HTTP_PORT, () => {
  console.log(
    `${C.green}${C.bold}✓ UI açık: http://localhost:${HTTP_PORT}${C.reset}`,
  );
});

// ─── Port Seç ─────────────────────────────────────────────────────────────────
async function selectPort() {
  const ports = await SerialPort.list();

  if (ports.length === 0) {
    console.error(`${C.red}[HATA] Hiç seri port bulunamadı!${C.reset}`);
    process.exit(1);
  }

  console.log(`\n${C.yellow}Bulunan portlar:${C.reset}`);
  ports.forEach((p, i) => {
    const desc = p.manufacturer || p.pnpId || "Bilinmiyor";
    console.log(
      `  ${C.green}[${i}]${C.reset} ${C.bold}${p.path}${C.reset}  ${C.gray}(${desc})${C.reset}`,
    );
  });

  if (FORCE_PORT) return FORCE_PORT;

  const priority = [
    "CH340",
    "CP210",
    "FTDI",
    "Silicon",
    "Prolific",
    "USB Serial",
  ];
  let chosen = ports.find((p) =>
    priority.some(
      (k) =>
        (p.manufacturer || "").includes(k) ||
        (p.pnpId || "").toUpperCase().includes(k.toUpperCase()),
    ),
  );
  if (!chosen) chosen = ports[0];

  console.log(
    `\n${C.cyan}Otomatik seçilen port: ${C.bold}${chosen.path}${C.reset}\n`,
  );
  return chosen.path;
}

// ─── Mesaj Parse ──────────────────────────────────────────────────────────────
function parseMessage(text) {
  const t = text.trim();

  const checking = t.match(/^Scenario\s+(\d+)\s+checking/i);
  if (checking) return { num: parseInt(checking[1]), event: "checking" };

  const success = t.match(/^Scenario\s+(\d+)\s+is\s+success/i);
  if (success) return { num: parseInt(success[1]), event: "success" };

  const fail = t.match(/^Scenario\s+(\d+)\s+is\s+fail/i);
  if (fail) return { num: parseInt(fail[1]), event: "fail" };

  return null;
}

// ─── Ana Logger ───────────────────────────────────────────────────────────────
async function startLogger() {
  const portPath = await selectPort();

  const port = new SerialPort({
    path: portPath,
    baudRate: BAUD_RATE,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    autoOpen: false,
  });

  let buffer = "";
  let recording = false;
  let msgCount = 0;

  port.on("data", (chunk) => {
    const raw = chunk.toString("binary");

    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];

      if (ch === "\r") {
        buffer = "";
        recording = true;
        continue;
      }

      if (ch === "\n") {
        if (recording && buffer.length > 0) {
          msgCount++;
          const ts = new Date().toLocaleTimeString("tr-TR", { hour12: false });
          const ms = String(new Date().getMilliseconds()).padStart(3, "0");
          const num = String(msgCount).padStart(5, "0");
          const txt = buffer.trim();

          console.log(
            `${C.gray}[${ts}.${ms}]${C.reset} ${C.green}#${num}${C.reset} ${C.bold}${txt}${C.reset}`,
          );

          const parsed = parseMessage(txt);

          broadcast({
            type: "message",
            text: txt,
            timestamp: `${ts}.${ms}`,
            count: msgCount,
            parsed,
          });
        }
        buffer = "";
        recording = false;
        continue;
      }

      if (recording) {
        buffer += ch;
        if (buffer.length > 4096) {
          buffer = "";
          recording = false;
        }
      }
    }
  });

  port.on("error", (err) => {
    console.error(`\n${C.red}[PORT HATASI]${C.reset} ${err.message}`);
    broadcast({ type: "portStatus", connected: false, error: err.message });
  });

  port.on("close", () => {
    console.log(`\n${C.yellow}[BAĞLANTI KESİLDİ] ${portPath}${C.reset}`);
    activePort = null;
    broadcast({ type: "portStatus", connected: false });
    setTimeout(() => {
      port.open();
    }, 2000);
  });

  port.open((err) => {
    if (err) {
      console.error(`\n${C.red}[AÇMA HATASI]${C.reset} ${err.message}`);
      broadcast({ type: "portStatus", connected: false, error: err.message });
      activePort = null;
      SerialPort.list().then((ports) => {
        if (ports.length > 0) {
          console.log(`\n${C.cyan}Mevcut portlar:${C.reset}`);
          ports.forEach((p) =>
            console.log(
              `  ${C.bold}${p.path}${C.reset}  ${C.gray}${p.manufacturer || ""}${C.reset}`,
            ),
          );
        }
      });
      return;
    }
    activePort = port;
    console.log(
      `${C.green}${C.bold}✓ Port açıldı: ${portPath} @ ${BAUD_RATE} baud${C.reset}`,
    );
    broadcast({ type: "portStatus", connected: true, port: portPath });
  });

  process.on("SIGINT", () => {
    console.log(`\n${C.cyan}Kapatılıyor...${C.reset}`);
    port.close(() => process.exit(0));
  });
}

startLogger().catch((err) => {
  console.error(`${C.red}[KRİTİK HATA]${C.reset}`, err);
  process.exit(1);
});
