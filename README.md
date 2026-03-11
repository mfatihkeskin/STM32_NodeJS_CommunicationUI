# 🧪 Otomatik Test Sistemi — Demo

> **Bu proje bir demo uygulamasıdır.** Gerçek bir seri üretim hattı otomatik test sisteminin basitleştirilmiş bir prototipini temsil etmektedir. Amaç; STM32 tabanlı test aparatının Node.js tabanlı bir PC uygulamasıyla USB-Serial üzerinden nasıl haberleşebileceğini göstermek ve test senaryolarının gerçek zamanlı olarak bir web arayüzünde izlenmesini sağlamaktır.

---

## 📋 İçindekiler

- [Proje Hakkında](#-proje-hakkında)
- [Sistem Mimarisi](#-sistem-mimarisi)
- [Donanım Gereksinimleri](#-donanım-gereksinimleri)
- [Yazılım Gereksinimleri](#-yazılım-gereksinimleri)
- [Dosya Yapısı](#-dosya-yapısı)
- [Kurulum](#-kurulum)
- [Fiziksel Bağlantı](#-fiziksel-bağlantı)
- [STM32 Tarafı](#-stm32-tarafı)
- [Node.js Tarafı](#-nodejs-tarafı)
- [Web Arayüzü Kullanımı](#-web-arayüzü-kullanımı)
- [Haberleşme Protokolü](#-haberleşme-protokolü)
- [Test Senaryoları](#-test-senaryoları)
- [Demo Modu](#-demo-modu)
- [Gerçek Ürüne Geçiş](#-gerçek-ürüne-geçiş)

---

## 📌 Proje Hakkında

Bu uygulama, **seri üretim hatlarında üretilen elektronik cihazların fonksiyonel testlerinin otomatize edilmesi** konseptini demostrasyonlamak amacıyla geliştirilmiştir.

### Temel Konsept

Bir üretim hattında çıkan her cihaz, çeşitli protokoller (UART, I2C, SPI, CAN) ve mekanik mekanizmalar (servo motor, fiziksel buton) üzerinden test edilmektedir. Bu testler normalde manuel yapıldığında hem zaman kaybına hem de insan hatasına yol açmaktadır. Bu sistem:

- Testleri otomatik olarak sırayla çalıştırır
- Her testin durumunu (başladı / başarılı / başarısız) gerçek zamanlı olarak PC ekranında gösterir
- Hata oluştuğunda sistemi durdurur ve operatörü bilgilendirir
- Tek tuşla testi yeniden başlatır

### Gerçek Projede Uygulanan Teknolojiler

| Alan              | Teknoloji                               |
| ----------------- | --------------------------------------- |
| Test Aparatı      | STM32 mikrodenetleyici                  |
| PC Uygulaması     | Node.js + WebSocket                     |
| Haberleşme        | USB üzerinden UART (CH340G)             |
| Protokol Testleri | UART, I2C, SPI, CAN                     |
| Mekanik Testler   | Micro servo motor, fiziksel buton basma |
| Arayüz            | HTML/CSS/JS — Tarayıcı tabanlı          |

---

## 🏗 Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                        PC Tarafı                            │
│                                                             │
│   ┌──────────────┐    WebSocket    ┌────────────────────┐  │
│   │  Tarayıcı    │ ◄────────────► │    Node.js         │  │
│   │  (UI)        │                │    app.js          │  │
│   │  localhost   │                │    HTTP :3000      │  │
│   │  :3000       │                │    WS   :3000      │  │
│   └──────────────┘                └─────────┬──────────┘  │
│                                             │               │
│                                        SerialPort          │
│                                        115200 baud         │
└─────────────────────────────────────────────────────────────┘
                                             │
                                        USB (COM5)
                                             │
                                    ┌────────┴────────┐
                                    │   CH340G        │
                                    │  USB-Serial     │
                                    │  Adaptör        │
                                    └────────┬────────┘
                                             │
                              TXD/RXD/GND (3 kablo)
                                             │
┌─────────────────────────────────────────────────────────────┐
│                     STM32 Tarafı                            │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  STM32U083MST6                                      │  │
│   │                                                     │  │
│   │  PA0 (USART4 TX) ──────────────► CH340G RXD        │  │
│   │  PA1 (USART4 RX) ◄────────────── CH340G TXD        │  │
│   │                                                     │  │
│   │  USART4 @ 115200 baud, 8N1                          │  │
│   │  UART RX Interrupt aktif                            │  │
│   │                                                     │  │
│   │  Test Senaryoları:                                  │  │
│   │  ├── Senaryo 1: UART Haberleşme                     │  │
│   │  ├── Senaryo 2: I2C Sensör                          │  │
│   │  ├── Senaryo 3: SPI Flash                           │  │
│   │  ├── Senaryo 4: CAN Bus                             │  │
│   │  ├── Senaryo 5: Servo Motor                         │  │
│   │  └── Senaryo 6: Buton Basma                         │  │
│   └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Donanım Gereksinimleri

| Bileşen            | Detay                               |
| ------------------ | ----------------------------------- |
| Mikrodenetleyici   | STM32U083MST6 (veya uyumlu STM32)   |
| USB-Serial Adaptör | CH340G çipli USB-Serial modül       |
| Bağlantı Kabloları | 3 adet jumper kablo (TXD, RXD, GND) |
| PC                 | Windows 10/11 (Node.js kurulu)      |

### UART Ayarları

| Parametre    | Değer  |
| ------------ | ------ |
| Baud Rate    | 115200 |
| Word Length  | 8 bit  |
| Parity       | None   |
| Stop Bits    | 1      |
| Flow Control | None   |

---

## 💻 Yazılım Gereksinimleri

### PC Tarafı

- **Node.js** v16 veya üzeri → [nodejs.org](https://nodejs.org)
- **npm** paketleri:
  - `serialport` — USB-Serial haberleşme
  - `ws` — WebSocket sunucusu

### STM32 Tarafı

- **STM32CubeIDE** veya uyumlu IDE
- **STM32CubeMX** — Peripheral konfigürasyonu
- **HAL** kütüphanesi (STM32U0 serisi)

### Tarayıcı

- Google Chrome, Firefox veya Edge (modern herhangi bir tarayıcı)

---

## 📁 Dosya Yapısı

```
NodeJS_HTML_CSS/
│
├── app.js              # Ana Node.js uygulaması
│                       # - USB-Serial port yönetimi
│                       # - HTTP server (port 3000)
│                       # - WebSocket server
│                       # - STM32'ye komut gönderimi
│                       # - Gelen dataların parse edilmesi
│
├── index.html          # Web arayüzü (HTML yapısı)
│                       # - 6 senaryo kartı
│                       # - Log paneli
│                       # - Test başlat / yeniden başlat butonu
│
├── style.css           # Arayüz stilleri
│                       # - Endüstriyel dark tema
│                       # - Durum renkleri (sarı/yeşil/kırmızı)
│                       # - Animasyonlar (scan line, pulse, shake)
│
└── package.json        # Node.js bağımlılıkları
```

---

## 🚀 Kurulum

### 1. Repoyu İndir veya Dosyaları Kopyala

Tüm dosyaları (`app.js`, `index.html`, `style.css`) aynı klasöre koy.

### 2. Bağımlılıkları Yükle

```bash
cd NodeJS_HTML_CSS
npm install serialport ws
```

### 3. STM32 Firmware'ini Yükle

STM32CubeIDE ile projeyi derle ve board'a flash'la.

**Kritik CubeMX Ayarları:**

- `USART4` → Mode: **Asynchronous**
- `USART4` → NVIC: **USART4/LPUART3 global interrupt → Enabled** ✓
- System Clock: HSI bazlı PLL ile yapılandırılmış

### 4. Uygulamayı Başlat

```bash
node app.js
```

Terminalde şu çıktıyı görmelisin:

```
Bulunan portlar:
  [0] COM5  (USB-SERIAL CH340)

Otomatik seçilen port: COM5

✓ UI açık: http://localhost:3000
✓ Port açıldı: COM5 @ 115200 baud
```

### 5. Tarayıcıda Aç

```
http://localhost:3000
```

---

## 🔌 Fiziksel Bağlantı

```
STM32 Board          CH340G Modül
─────────────        ────────────
PA0 (USART4 TX) ──► RXD
PA1 (USART4 RX) ◄── TXD
GND             ──── GND

⚠ 5V ve 3.3V pinlerine DOKUNMA — güç USB'den alınıyor.
⚠ TX → RX çapraz bağlanmalı.
⚠ GND ortak olmalı.
```

**Aygıt Yöneticisi'nde** `Bağlantı Noktaları (COM ve LPT)` altında `USB-SERIAL CH340 (COMx)` görünmelidir.

---

## ⚙ STM32 Tarafı

### Haberleşme Mantığı

STM32, UART RX interrupt ile çalışır. PC'den `\rSTART\n` mesajı geldiğinde `testStarted` flag'i set edilir ve test döngüsü başlar.

```c
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
  if (huart->Instance == USART4)
  {
    // \r → buffer başlangıcı
    // \n → buffer sonu, mesajı işle
    // "START" → testStarted = 1
    HAL_UART_Receive_IT(&huart4, &rxByte, 1); // Sonraki byte için yeniden aç
  }
}
```

### TX/RX Çakışma Çözümü

`UART_SendLine` çağrısı öncesinde RX interrupt durdurulur, TX tamamlandıktan sonra yeniden başlatılır:

```c
void UART_SendLine(const char *msg)
{
  HAL_UART_AbortReceive(&huart4);          // RX durdur
  HAL_UART_Transmit(&huart4, buf, len, 100); // Gönder
  HAL_UART_Receive_IT(&huart4, &rxByte, 1); // RX yeniden başlat
}
```

### Test Akışı

```
testStarted = 1
      │
      ▼
Senaryo 1 → checking → success/fail
      │
      ▼
Senaryo 2 → checking → success/fail
      │
     ...
      │
      ▼
Senaryo 6 → checking → success/fail
      │
      ▼
"Test stopped!" gönder
```

---

## 🖥 Node.js Tarafı

### Port Seçimi

`app.js` başlatıldığında sistemdeki tüm COM portları listelenir. CH340G, CP210x, FTDI gibi yaygın USB-Serial çipleri otomatik olarak önceliklendirilir. Manuel seçim için:

```javascript
const FORCE_PORT = "COM5"; // null bırakılırsa otomatik seçer
```

### Buffer Protokolü

Gelen ham veri `\r` / `\n` ile parse edilir:

```
\r → Buffer sıfırla, kayda başla
\n → Buffer doldu, mesajı işle
```

### Mesaj Parse Mantığı

```
"Scenario 3 checking..."  → { num: 3, event: 'checking' }
"Scenario 3 is success"   → { num: 3, event: 'success'  }
"Scenario 3 is fail"      → { num: 3, event: 'fail'     }
"Test stopped!"           → Sistem durdur, buton aktif et
```

### WebSocket Mesajları

| Yön         | Mesaj                                                   | Açıklama               |
| ----------- | ------------------------------------------------------- | ---------------------- |
| Server → UI | `{ type: 'portStatus', connected: true, port: 'COM5' }` | Port durumu            |
| Server → UI | `{ type: 'message', text: '...', parsed: {...} }`       | Seri port verisi       |
| Server → UI | `{ type: 'startAck', success: true }`                   | START gönderildi onayı |
| UI → Server | `{ type: 'startTest' }`                                 | Test başlat komutu     |

---

## 🎮 Web Arayüzü Kullanımı

### Ekran Bölümleri

```
┌─────────────────────────────────────────────────┐
│ LOGO    STM32 · USART4 · 115200    [COM5 ●] [▶] │  ← Header
├──────────────── ████░░░░ ─────── SENARYO 2 ──────┤  ← Status Bar
│                                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ ✓ SEN.1 │  │ ⟳ SEN.2 │  │   SEN.3 │           │  ← Senaryo Kartları
│  │  YEŞİL  │  │  SARI   │  │  (IDLE) │           │
│  └─────────┘  └─────────┘  └─────────┘           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │   SEN.4 │  │   SEN.5 │  │   SEN.6 │           │
│  └─────────┘  └─────────┘  └─────────┘           │
├───────────────────────────────────────────────────┤
│ Seri Port Logu                    [0 mesaj][TEMİZ]│
│ [12:34:56.123] #00001 Scenario 1 checking...      │  ← Log Paneli
│ [12:35:01.456] #00002 Scenario 1 is success       │
└───────────────────────────────────────────────────┘
```

### Kart Renk Kodları

| Renk        | Anlam                                              |
| ----------- | -------------------------------------------------- |
| ⬛ Koyu gri | IDLE — henüz test edilmedi                         |
| 🟡 Sarı     | CHECKING — test devam ediyor, scan line animasyonu |
| 🟢 Yeşil    | SUCCESS — test başarıyla tamamlandı, sabit kalır   |
| 🔴 Kırmızı  | FAIL — test başarısız, sarsılma animasyonu         |

### Buton Durumları

| Durum                     | Buton                                     |
| ------------------------- | ----------------------------------------- |
| Port bağlı, test bekliyor | `▶ TESTİ BAŞLAT` — aktif, yeşil           |
| Test çalışıyor            | `⏳ TEST ÇALIŞIYOR...` — disabled         |
| Test bitti (success/fail) | `▶ TESTİ BAŞLAT` — tekrar aktif           |
| Port bağlı değil          | `▶ TESTİ BAŞLAT` — tıklayınca uyarı verir |

### Test Akışı (Kullanıcı Perspektifi)

1. `node app.js` çalıştır
2. `http://localhost:3000` aç
3. Sağ üstte **COM5 ●** yeşil bağlantı göstergesi görünür
4. **▶ TESTİ BAŞLAT** butonuna bas
5. STM32'ye `\rSTART\n` gönderilir
6. Kartlar sırayla sarı → yeşil olur
7. Hata varsa ilgili kart kırmızı olur, overlay açılır
8. **↺ TEKRAR TEST ET** butonu ile yeniden başlatılır (otomatik START gönderir)

---

## 📡 Haberleşme Protokolü

### PC → STM32

| Mesaj       | Format      | Açıklama                    |
| ----------- | ----------- | --------------------------- |
| Test Başlat | `\rSTART\n` | Tüm test sekansını başlatır |

### STM32 → PC

| Mesaj             | Format                       | Açıklama               |
| ----------------- | ---------------------------- | ---------------------- |
| Senaryo Başladı   | `\rScenario N checking...\n` | N: 1-6                 |
| Senaryo Başarılı  | `\rScenario N is success\n`  | N: 1-6                 |
| Senaryo Başarısız | `\rScenario N is fail\n`     | N: 1-6                 |
| Test Bitti        | `\rTest stopped!\n`          | Her durumda gönderilir |

**Buffer Protokolü:** Her mesaj `\r` ile başlar, `\n` ile biter. `\r` gelince buffer sıfırlanır, `\n` gelince mesaj işlenir.

---

## 🧩 Test Senaryoları

Demo'da tanımlanan 6 senaryo gerçek projeden alınmıştır:

| #   | Senaryo                 | Açıklama                         |
| --- | ----------------------- | -------------------------------- |
| 1   | UART Haberleşme Testi   | Baud rate & frame doğrulama      |
| 2   | I2C Sensör Okuma        | Slave adresi & register kontrolü |
| 3   | SPI Flash Bellek Testi  | Yazma / okuma doğrulama          |
| 4   | CAN Bus İletişim Testi  | Frame ID & data byte kontrolü    |
| 5   | Servo Motor Kalibrasyon | PWM pulse & açı doğrulama        |
| 6   | Buton Fiziksel Basma    | Mekanik tetik & debounce testi   |

---

## 🎭 Demo Modu

Bu uygulama **demo amaçlıdır.** Gerçek donanım testleri STM32 kodunda `result` değişkenine bağlıdır:

```c
// Demo: hepsini başarılı yap
uint8_t result = SUCCESS;

// Demo: belirli senaryoyu başarısız yap
uint8_t result = (currentState == STATE_3) ? FAILURE : SUCCESS;
```

Gerçek uygulamada bu satırın yerine donanım ölçümü, sensör okuma veya protokol doğrulama kodu gelir.

**Demo ile gerçek uygulama arasındaki farklar:**

| Özellik         | Demo                        | Gerçek                    |
| --------------- | --------------------------- | ------------------------- |
| Test süresi     | `HAL_Delay(3000)` sabit     | Gerçek ölçüm süresi       |
| Test sonucu     | Sabit `SUCCESS`/`FAILURE`   | Donanımdan okunan değer   |
| Senaryo içeriği | Boş (sadece mesaj gönderir) | I2C, SPI, CAN, servo kodu |
| Hata tespiti    | Manuel olarak ayarlanır     | Otomatik eşik kontrolü    |

---

## 🔄 Gerçek Ürüne Geçiş

Demo'yu gerçek bir test sistemine dönüştürmek için STM32 tarafında her senaryo bloğuna ilgili donanım testi eklenir:

```c
case STATE_2: // I2C Sensör Testi
  UART_SendLine("Scenario 2 checking...");

  // Gerçek test kodu buraya gelir:
  uint8_t i2cData;
  HAL_StatusTypeDef i2cStatus = HAL_I2C_Mem_Read(
    &hi2c1, SENSOR_ADDR, REG_ID, 1, &i2cData, 1, 100
  );
  uint8_t result = (i2cStatus == HAL_OK && i2cData == EXPECTED_ID)
                   ? SUCCESS : FAILURE;

  // Sonucu gönder (mevcut kod devam eder)
  ...
```

Node.js ve web arayüzü tarafında **hiçbir değişiklik gerekmez** — protokol aynı kaldığı sürece her türlü test senaryosu desteklenir.

---

## ⚠ Bilinen Sınırlamalar (Demo)

- Test senaryoları gerçek donanım testi yapmaz, sadece mesaj gönderir
- Tek yönlü test akışı: sıralı, paralel test desteği yoktur
- USB bağlantısı kesilirse uygulama 2 saniye sonra yeniden bağlanmaya çalışır
- Aynı anda yalnızca bir tarayıcı sekmesi tutarlı çalışır (WebSocket broadcast tüm sekmelere gider)

---

## 📝 Lisans

Bu proje demo amaçlı geliştirilmiştir. Ticari kullanım için gerekli adaptasyonlar yapılmalıdır.
