# DXF Yapısal Eleman Analiz Web Uygulaması

## 📋 Proje Özeti

Bu web uygulaması, **gerçek DXF dosyalarından** yapısal elemanları otomatik olarak tespit ederek layer bazlı analiz yapar, benzer kesitleri gruplandırır ve detaylı raporlar sunar.

## 🎯 Ana Özellikler

### 1. **Gerçek DXF Parsing** ✅
- DXF dosyalarını okuma ve parse etme
- Layer bazlı filtreleme
- Otomatik entity tespiti (POLYLINE, LINE, CIRCLE, ARC)
- Boyut ölçümü (bounding box, çap, uzunluk)

### 2. **Layer Bazlı Sınıflandırma** 🎨
Uygulama aşağıdaki layer adı desenlerini otomatik olarak tanır:

**Kolonlar için:**
- KOLON, COLUMN, COL, SUTUN

**Perde Duvarlar için:**
- PERDE, WALL, SHEARWALL, DUVAR

**Çekirdekler için:**
- CEKIRDEK, CORE, ASANSOR, ELEVATOR, MERDIVEN, STAIR

### 3. **Akıllı Boyut Ölçümü** 📏
- **Dikdörtgen/Kare Kesitler**: Bounding box hesaplama
- **Dairesel Kesitler**: Çap ve yarıçap ölçümü
- **Duvarlar**: Kalınlık ve uzunluk
- **Tolerans**: 2cm hassasiyetle benzer boyutları gruplandırma

### 4. **Otomatik Gruplama** 🔢
- Benzer kesitleri otomatik tespit
- Tip bazlı isimlendirme (K1, K2, P1, P2, Ç1, Ç2...)
- En çok kullanılan kesitleri öncelikli gösterme
- Her grup için adet sayımı

### 5. **Export Özellikleri** 📊
- **CSV/Excel**: Tüm verileri indirme (Türkçe karakter desteği)
- **3D DXF**: Analiz edilen elemanları 3D DXF olarak indirme
- Tarih damgalı dosya isimleri

## 🛠️ Teknolojiler

### Frontend
- **HTML5**: Semantik yapı
- **CSS3**: Modern dark theme, animasyonlar
- **JavaScript (ES6+)**: Async/await, modern syntax

### Kütüphaneler
- **dxf-parser (v1.5.0)**: DXF dosyası parsing
- **Chart.js**: İnteraktif grafikler
- **Font Awesome 6**: İkonlar
- **Google Fonts (Inter)**: Tipografi

## 📁 Proje Yapısı

```
dwg-yapisal-analiz/
│
├── index.html          # Ana HTML (DXF parser CDN dahil)
├── style.css           # Tüm stil tanımlamaları
├── script.js           # Profesyonel DXF parser kodu
└── README.md           # Bu dosya
```

## 🚀 Kurulum ve Kullanım

### 1. Basit Kullanım (Lokal)
```bash
cd dwg-yapisal-analiz
python -m http.server 8000
```
Tarayıcıda `http://localhost:8000` adresine gidin.

### 2. DXF Dosyası Hazırlama
DWG dosyalarınızı DXF formatına dönüştürün:

**AutoCAD'de:**
1. File → Save As
2. Format: "AutoCAD 2013 DXF (*.dxf)"
3. Kaydet

**Online Araçlar:**
- [Autodesk Online Converter](https://www.autodesk.com/products/dwg)
- Bear File Converter

### 3. Layer İsimlendirme
DXF dosyanızda layer isimleri şu kalıplardan birini içermeli:

```
✅ Doğru örnekler:
- "KOLON_50x50"
- "PROJE_PERDE_30"
- "ASANSOR_CEKIRDEK"
- "COLUMN_LAYER"

❌ Yanlış örnekler:
- "Layer1"
- "0"
- "RANDOM_NAME"
```

## 📊 Analiz Süreci

```
1. DXF Dosyası Yükleme
   ↓
2. DXF Parse (dxf-parser)
   ↓
3. Layer Listesi Çıkarma
   ↓
4. Pattern Matching (KOLON, PERDE, CEKIRDEK)
   ↓
5. Entity'leri Filtreleme
   ↓
6. Boyut Ölçümü (measureEntity)
   ↓
7. Benzer Boyutları Gruplama (2cm tolerans)
   ↓
8. Tip İsimlendirme (K1, K2, P1, P2...)
   ↓
9. Sonuçları Görselleştirme
```

## 🔧 Kod Yapısı

### Ana Fonksiyonlar

```javascript
// DXF Parsing
parseDXF(content)                 // DXF'i parse et
extractLayers(dxf)                // Layer listesi çıkar
extractEntitiesByLayerPattern()   // Layer'a göre filtrele

// Boyut Ölçümü
measureEntity(entity)             // Entity boyutunu ölç
measurePolyline(entity)           // Polyline için bounding box
measureCircle(entity)             // Circle için çap/yarıçap
measureLine(entity)               // Line için uzunluk

// Sınıflandırma
classifyElements(entities, type)  // Gruplandırma
areSimilarDimensions(e1, e2)     // Boyut karşılaştırma
formatElementGroup(group)         // Formatlama

// Görselleştirme
displayResults(results)           // Tabloları doldur
createDistributionChart()         // Grafik oluştur
```

### Yapılandırma Sabitleri

```javascript
// Layer Pattern'leri (script.js içinde)
const LAYER_PATTERNS = {
    columns: ['KOLON', 'COLUMN', 'COL', 'SUTUN'],
    walls: ['PERDE', 'WALL', 'SHEARWALL', 'DUVAR'],
    cores: ['CEKIRDEK', 'CORE', 'ASANSOR', 'ELEVATOR', 'MERDIVEN', 'STAIR']
};

// Tolerans (cm)
const DIMENSION_TOLERANCE = 2;
```

## 📝 Çıktı Formatı

### Kolon Raporu
```
K1: 50×50 cm    (24 adet)
K2: 60×60 cm    (18 adet)
K3: 50×80 cm    (12 adet)
```

### Perde Duvar Raporu
```
P1: 30cm kalınlık, 6.5m uzunluk  (8 adet)
P2: 25cm kalınlık, 4.2m uzunluk  (12 adet)
```

### Çekirdek Raporu
```
Ç1: 4.5m × 6.0m, 30cm duvar  (2 adet)
Ç2: 5.0m × 5.0m, 35cm duvar  (1 adet)
```

## 🎨 Layer İsimlendirme Best Practices

### Önerilen Formatlar
```
✅ Kolon layer'ları:
KOLON_50x50
KOLON_60x60
COLUMN_MAIN
SUTUN_TIP1

✅ Perde layer'ları:
PERDE_30
PERDE_DUVAR_25
SHEARWALL_TYPE1
DUVAR_TAŞIYICI

✅ Çekirdek layer'ları:
CEKIRDEK_ASANSOR
CORE_ELEVATOR
MERDIVEN_CEKIRDEK
STAIR_CORE
```

## 🔍 Troubleshooting

### "Kolon bulunamadı" Hatası
✅ **Çözüm:**
- DXF dosyasındaki layer isimlerini kontrol edin
- Layer isimleri KOLON, COLUMN, COL veya SUTUN içermeli
- Console'da bulunan layer'ları görebilirsiniz (F12)

### "DXF Parser kütüphanesi yüklenemedi"
✅ **Çözüm:**
- İnternet bağlantınızı kontrol edin
- CDN erişilebilir olmalı
- Firewall/proxy ayarlarını kontrol edin

### "DXF dosyası parse edilemedi"
✅ **Çözüm:**
- Dosyanın gerçekten DXF formatında olduğundan emin olun
- DXF versiyonu 2013 veya üstü olmalı
- Dosya bozuk olabilir, yeniden export edin

### Boyutlar Yanlış Görünüyor
✅ **Çözüm:**
- DXF dosyasındaki birim ayarlarını kontrol edin
- Kod metrik sistem kullanır (metre → cm dönüşümü)
- İhtiyaç halinde toleransı artırın

## 🚀 Gelişmiş Özellikler (İsteğe Bağlı)

### 1. Kendi Layer Pattern'lerinizi Ekleyin

`script.js` dosyasında:
```javascript
const LAYER_PATTERNS = {
    columns: ['KOLON', 'COLUMN', 'COL', 'SUTUN', 'KENDI_PATTERN'],
    walls: ['PERDE', 'WALL', 'CUSTOM_WALL'],
    cores: ['CEKIRDEK', 'CORE', 'MY_CORE']
};
```

### 2. Toleransı Ayarlayın

```javascript
// 2cm yerine 5cm tolerans
const DIMENSION_TOLERANCE = 5;
```

### 3. Yeni Element Tipleri Ekleyin

```javascript
// Kiriş (beam) desteği eklemek için:
const LAYER_PATTERNS = {
    // ... mevcut pattern'ler
    beams: ['KIRIŞ', 'BEAM', 'KIRISH']
};
```

## 📈 Performans

- **Dosya Boyutu**: Maks 50MB
- **Parse Süresi**: ~2-5 saniye (orta boyut dosya)
- **Entity Sayısı**: 10,000+ entity desteklenir
- **Memory**: Client-side işlem, sunucu gerektirmez

## 🔒 Güvenlik

- ✅ Client-side processing (dosya sunucuya gönderilmez)
- ✅ Dosya boyutu kontrolü
- ✅ Format validasyonu
- ✅ XSS koruması

## 🤝 Katkıda Bulunma

Geliştirme fikirleri:
1. ✅ Layer bazlı DXF parsing (TAMAMLANDI)
2. ✅ 2D plan görselleştirme (Canvas/SVG) (TAMAMLANDI)
3. ✅ 3D önizleme (Three.js) (TAMAMLANDI)
4. ✅ 3D DXF export (TAMAMLANDI)
5. ⏳ Metraj hesaplamaları
6. ⏳ Custom layer mapping UI
7. ⏳ Çoklu kat desteği (Multi-story support)

## 📄 Lisans

Bu proje eğitim ve demo amaçlıdır.

## 👤 Destek

Sorular için console log'ları kontrol edin:
```javascript
// Tarayıcıda F12 → Console
// Bulunan layer'ları gösterir
console.log('Bulunan katmanlar:', layers);
```

---

**Versiyon**: 2.0 - Profesyonel DXF Parser  
**Son Güncelleme**: 2026-02-17  
**Durum**: ✅ Gerçek DXF dosyaları ile çalışır
