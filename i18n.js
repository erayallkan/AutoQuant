// ============================================
// INTERNATIONALIZATION (i18n) SYSTEM
// ============================================

const TRANSLATIONS = {
    tr: {
        // Page
        pageTitle: 'AutoQuant - by ealkan',
        pageDescription: 'AutoQuant ile DXF dosyalarınızı yükleyin, yapısal elemanların metrajını saniyeler içinde çıkarın.',

        // Upload
        uploadTitle: 'DXF Dosyanızı Yükleyin',
        uploadDesc: 'Dosyanızı sürükleyin veya tıklayarak seçin',
        uploadHint: 'DWG dosyalarını AutoCAD\'de "Save As → DXF" ile dönüştürün',
        uploadDrag: 'Dosyayı buraya sürükleyin',
        uploadOr: 'veya',
        selectFile: 'Dosya Seç',

        // Loading
        analyzing: 'Dosyanız Analiz Ediliyor...',
        readingFile: 'DXF dosyası okunuyor',

        // Layer Selection
        foundLayers: 'Bulunan Katmanlar',
        layerDesc: 'DXF dosyanızda bulunan layer\'ları aşağıda görüyorsunuz. Her layer için bir kategori seçin.',
        layerName: 'Layer Adı',
        elementCount: 'Element Sayısı',
        category: 'Kategori',
        noSelection: '-- Seçim Yok --',
        columnCat: 'Kolon',
        wallCat: 'Perde Duvar',
        coreCat: 'Çekirdek',
        beamCat: 'Kiriş',
        slabCat: 'Döşeme',
        thicknessDepth: 'Kalınlık/Yükseklik (cm)',
        startAnalysis: 'Analizi Başlat',
        cancel: 'İptal',

        // Results
        analysisResults: 'Analiz Sonuçları',
        downloadExcel: 'Excel İndir',
        export3dDxf: '3D DXF İndir',
        newAnalysis: 'Yeni Analiz',
        addFloor: 'Kapat ve Yeni Kat Ekle',
        floorName: 'Kat Adı',
        floorHeightTitle: 'Yükseklik',
        actions: 'İşlemler',
        delete: 'Sil',
        totalBuildingMetraj: 'Toplam Bina Metrajı',
        floorList: 'Yüklenen Katlar',

        // Summary Cards
        column: 'Kolon',
        wall: 'Perde',
        core: 'Çekirdek',
        beam: 'Kiriş',
        slab: 'Döşeme',
        totalElements: 'Toplam Eleman Adedi',

        // Tables
        columnDetails: 'Kolon Detayları',
        wallDetails: 'Perde Duvar Detayları',
        coreDetails: 'Çekirdek Detayları',
        beamDetails: 'Kiriş Detayları',
        slabDetails: 'Döşeme Detayları',
        typeName: 'Tip Adı',
        sectionSize: 'Kesit Boyutu',
        totalLength: 'Toplam Uzunluk (m)',
        totalArea: 'Toplam Alan (m²)',
        count: 'Adet',
        noColumnFound: 'Kolon bulunamadı',
        noWallFound: 'Perde duvar bulunamadı',
        noCoreFound: 'Çekirdek bulunamadı',
        noBeamFound: 'Kiriş bulunamadı',
        noSlabFound: 'Döşeme bulunamadı',

        // Chart
        elementDistribution: 'Eleman Dağılımı',
        columns: 'Kolonlar',
        walls: 'Perde Duvarlar',
        cores: 'Çekirdekler',
        unit: 'adet',

        // DXF Preview
        dxfPreview: 'DXF Önizleme',
        zoomIn: 'Yakınlaştır',
        zoomOut: 'Uzaklaştır',
        resetView: 'Sıfırla',
        toggle3D: '3D Görünüm',
        toggle2D: '2D Görünüm',
        floorHeight: 'Kat Yüksekliği (m)',
        dimName: 'İsim',
        dimSize: 'Boyut',
        dimArea: 'Alan',

        // Footer
        copyright: '© 2026 Eray Alkan. Tüm hakları saklıdır.',
        developedBy: 'Developed by',

        // Toast messages
        fileUploaded: 'yüklendi, analiz başlatılıyor...',
        analysisComplete: 'Analiz tamamlandı!',
        excelPreparing: 'Excel dosyası hazırlanıyor...',
        excelDownloaded: 'Excel dosyası indirildi!',
        newAnalysisReady: 'Yeni analiz için dosya yükleyebilirsiniz',
        errorSelectDxf: 'Lütfen DXF veya DWG dosyası seçin! (Şu an sadece DXF desteklenmektedir)',
        errorConvertDwg: 'DWG dosyaları için lütfen önce DXF formatına dönüştürün (AutoCAD: Save As > DXF)',
        errorFileSize: 'Dosya boyutu 50MB\'dan küçük olmalıdır!',
        errorNoLayer: 'DXF dosyasında layer bulunamadı!',
        errorSelectLayer: 'Lütfen en az bir layer için kategori seçin!',
        errorParseFailed: 'DXF dosyası parse edilemedi',
        errorParserNotLoaded: 'DXF Parser kütüphanesi yüklenemedi. Lütfen internet bağlantınızı kontrol edin.',
        errorInvalidDxf: 'DXF dosyası geçersiz veya boş',

        // Progress
        progressReading: 'DXF dosyası okunuyor...',
        progressParsing: 'DXF yapısı parse ediliyor...',
        progressListingLayers: 'Katmanlar listeleniyor...',
        progressAnalyzing: 'Seçilen layer\'lar analiz ediliyor...',
        progressMeasuring: 'Boyutlar ölçülüyor ve gruplandırılıyor...',
        progressPreparing: 'Sonuçlar hazırlanıyor...',

        // Theme
        darkMode: 'Karanlık',
        lightMode: 'Aydınlık',

        // Shape
        circular: 'Dairesel',
        rectangular: 'Dikdörtgen',

        // Preview interaction
        clearSelection: 'Seçimi Temizle',
        clickToHighlight: 'Elemana tıklayarak önizlemede vurgulayın',
    },
    en: {
        // Page
        pageTitle: 'AutoQuant - DWG Structural Analysis',
        pageDescription: 'Upload your DWG files with AutoQuant and get structural element quantities in seconds.',

        // Upload
        uploadTitle: 'Upload Your DXF File',
        uploadDesc: 'Drag your file or click to select',
        uploadHint: 'Convert DWG files in AutoCAD via "Save As → DXF"',
        uploadDrag: 'Drag your file here',
        uploadOr: 'or',
        selectFile: 'Select File',

        // Loading
        analyzing: 'Analyzing Your File...',
        readingFile: 'Reading DXF file',

        // Layer Selection
        foundLayers: 'Found Layers',
        layerDesc: 'Below are the layers found in your DXF file. Select a category for each layer.',
        layerName: 'Layer Name',
        elementCount: 'Element Count',
        category: 'Category',
        noSelection: '-- No Selection --',
        columnCat: 'Column',
        wallCat: 'Shear Wall',
        coreCat: 'Core',
        beamCat: 'Beam',
        slabCat: 'Slab',
        startAnalysis: 'Start Analysis',
        cancel: 'Cancel',

        // Results
        analysisResults: 'Analysis Results',
        downloadExcel: 'Download Excel',
        export3dDxf: 'Download 3D DXF',
        newAnalysis: 'New Analysis',
        addFloor: 'Save & Add Another Floor',
        floorName: 'Floor Name',
        floorHeightTitle: 'Height',
        actions: 'Actions',
        delete: 'Delete',
        totalBuildingMetraj: 'Total Building Summary',
        floorList: 'Uploaded Floors',

        // Summary Cards
        column: 'Column',
        wall: 'Wall',
        core: 'Core',
        beam: 'Beam',
        slab: 'Slab',
        totalElements: 'Total Elements',

        // Tables
        columnDetails: 'Column Details',
        wallDetails: 'Shear Wall Details',
        coreDetails: 'Core Details',
        beamDetails: 'Beam Details',
        slabDetails: 'Slab Details',
        typeName: 'Type Name',
        sectionSize: 'Section Size',
        totalLength: 'Total Length (m)',
        totalArea: 'Total Area (m²)',
        count: 'Count',
        noColumnFound: 'No columns found',
        noWallFound: 'No shear walls found',
        noCoreFound: 'No cores found',
        noBeamFound: 'No beams found',
        noSlabFound: 'No slabs found',

        // Chart
        elementDistribution: 'Element Distribution',
        columns: 'Columns',
        walls: 'Shear Walls',
        cores: 'Cores',
        unit: 'pcs',

        // DXF Preview
        dxfPreview: 'DXF Preview',
        zoomIn: 'Zoom In',
        zoomOut: 'Zoom Out',
        resetView: 'Reset',
        toggle3D: '3D View',
        toggle2D: '2D View',
        floorHeight: 'Floor Height (m)',
        dimName: 'Name',
        dimSize: 'Size',
        dimArea: 'Area',

        // Footer
        copyright: '© 2026 Eray Alkan. All rights reserved.',
        developedBy: 'Developed by',

        // Toast messages
        fileUploaded: 'uploaded, starting analysis...',
        analysisComplete: 'Analysis complete!',
        excelPreparing: 'Preparing Excel file...',
        excelDownloaded: 'Excel file downloaded!',
        newAnalysisReady: 'You can upload a file for a new analysis',
        errorSelectDxf: 'Please select a DXF or DWG file! (Only DXF is currently supported)',
        errorConvertDwg: 'Please convert DWG files to DXF first (AutoCAD: Save As > DXF)',
        errorFileSize: 'File size must be less than 50MB!',
        errorNoLayer: 'No layers found in DXF file!',
        errorSelectLayer: 'Please select a category for at least one layer!',
        errorParseFailed: 'Failed to parse DXF file',
        errorParserNotLoaded: 'DXF Parser library could not be loaded. Please check your internet connection.',
        errorInvalidDxf: 'DXF file is invalid or empty',

        // Progress
        progressReading: 'Reading DXF file...',
        progressParsing: 'Parsing DXF structure...',
        progressListingLayers: 'Listing layers...',
        progressAnalyzing: 'Analyzing selected layers...',
        progressMeasuring: 'Measuring and grouping dimensions...',
        progressPreparing: 'Preparing results...',

        // Theme
        darkMode: 'Dark',
        lightMode: 'Light',

        // Shape
        circular: 'Circular',
        rectangular: 'Rectangular',

        // Preview interaction
        clearSelection: 'Clear Selection',
        clickToHighlight: 'Click a row to highlight it on the preview',
    }
};

// Current language
let currentLang = localStorage.getItem('dwg-lang') || 'tr';

// Translate function
function t(key) {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS['tr'][key] || key;
}

// Switch language
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('dwg-lang', lang);
    applyLanguage();
}

// Apply language to all static UI elements
function applyLanguage() {
    // Update page title
    document.title = t('pageTitle');

    // Update data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    // Update data-i18n-placeholder elements
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });

    // Update language toggle buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });

    // Update theme toggle label
    const themeLabel = document.getElementById('themeLabel');
    if (themeLabel) {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        themeLabel.textContent = isDark ? t('darkMode') : t('lightMode');
    }
}

// Make available globally
window.TRANSLATIONS = TRANSLATIONS;
window.t = t;
window.setLanguage = setLanguage;
window.applyLanguage = applyLanguage;
window.currentLang = currentLang;
