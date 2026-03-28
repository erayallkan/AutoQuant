// ============================================
// DWG YAPISAL ANALİZ - PROFESSIONAL DXF PARSER
// ============================================

// Global variables
let uploadedFile = null;
let analysisResults = null;
let dxfData = null;

// Layer name patterns for classification
const LAYER_PATTERNS = {
    columns: ['KOLON', 'COLUMN', 'COL', 'SUTUN'],
    walls: ['PERDE', 'WALL', 'SHEARWALL', 'DUVAR'],
    cores: ['CEKIRDEK', 'CORE', 'ASANSOR', 'ELEVATOR', 'MERDIVEN', 'STAIR']
};

// Tolerance for dimension comparison (cm)
const DIMENSION_TOLERANCE = 2;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const dropArea = document.getElementById('dropArea');
const uploadSection = document.getElementById('uploadSection');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const loadingText = document.getElementById('loadingText');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Export buttons
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const newAnalysisBtn = document.getElementById('newAnalysisBtn');

// ============================================
// EVENT LISTENERS
// ============================================

selectFileBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
});

dropArea.addEventListener('click', () => fileInput.click());

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
});

exportPdfBtn.addEventListener('click', exportToPDF);
exportExcelBtn.addEventListener('click', exportToExcel);
newAnalysisBtn.addEventListener('click', resetAnalysis);

// ============================================
// FILE HANDLING
// ============================================

function handleFileUpload(file) {
    const fileName = file.name.toLowerCase();

    // Validate file type
    if (!fileName.endsWith('.dxf') && !fileName.endsWith('.dwg')) {
        showToast('Lütfen DXF veya DWG dosyası seçin! (Şu an sadece DXF desteklenmektedir)', 'error');
        return;
    }

    // For now, only DXF is supported
    if (fileName.endsWith('.dwg')) {
        showToast('DWG dosyaları için lütfen önce DXF formatına dönüştürün (AutoCAD: Save As > DXF)', 'error');
        return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
        showToast('Dosya boyutu 50MB\'dan küçük olmalıdır!', 'error');
        return;
    }

    uploadedFile = file;
    showToast(`${file.name} yüklendi, analiz başlatılıyor...`, 'success');
    setTimeout(() => analyzeFile(file), 500);
}

// ============================================
// DXF FILE ANALYSIS
// ============================================

async function analyzeFile(file) {
    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');

    try {
        // Step 1: Read file
        await updateProgress('DXF dosyası okunuyor...', 10);
        const fileContent = await file.text();

        // Step 2: Parse DXF
        await updateProgress('DXF yapısı parse ediliyor...', 25);
        dxfData = await parseDXF(fileContent);

        if (!dxfData) {
            throw new Error('DXF dosyası parse edilemedi');
        }

        // Step 3: Extract layers
        await updateProgress('Katmanlar analiz ediliyor...', 40);
        const layers = extractLayers(dxfData);
        console.log('Bulunan katmanlar:', layers);

        // Step 4: Extract entities by layer
        await updateProgress('Kolon elemanları tespit ediliyor...', 55);
        const columnEntities = extractEntitiesByLayerPattern(dxfData, LAYER_PATTERNS.columns);

        await updateProgress('Perde duvarlar tespit ediliyor...', 70);
        const wallEntities = extractEntitiesByLayerPattern(dxfData, LAYER_PATTERNS.walls);

        await updateProgress('Çekirdek elemanlar tespit ediliyor...', 85);
        const coreEntities = extractEntitiesByLayerPattern(dxfData, LAYER_PATTERNS.cores);

        // Step 5: Measure and classify
        await updateProgress('Boyutlar ölçülüyor ve gruplandırılıyor...', 95);
        const columns = classifyElements(columnEntities, 'column');
        const walls = classifyElements(wallEntities, 'wall');
        const cores = classifyElements(coreEntities, 'core');

        analysisResults = { columns, walls, cores };

        // Step 6: Display results
        await updateProgress('Sonuçlar hazırlanıyor...', 100);
        await sleep(300);

        displayResults(analysisResults);
        loadingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        showToast('Analiz tamamlandı!', 'success');

    } catch (error) {
        console.error('Analiz hatası:', error);
        showToast(`Hata: ${error.message}`, 'error');
        loadingSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    }
}

// ============================================
// DXF PARSING
// ============================================

async function parseDXF(content) {
    try {
        // Using dxf-parser library (loaded via CDN)
        if (typeof DxfParser === 'undefined') {
            throw new Error('DXF Parser kütüphanesi yüklenemedi. Lütfen internet bağlantınızı kontrol edin.');
        }

        const parser = new DxfParser();
        const dxf = parser.parseSync(content);

        if (!dxf || !dxf.entities) {
            throw new Error('DXF dosyası geçersiz veya boş');
        }

        return dxf;
    } catch (error) {
        console.error('DXF parse hatası:', error);
        throw new Error('DXF dosyası okunamadı: ' + error.message);
    }
}

function extractLayers(dxf) {
    const layers = new Set();

    if (dxf.tables && dxf.tables.layer) {
        Object.keys(dxf.tables.layer.layers).forEach(layerName => {
            layers.add(layerName);
        });
    }

    if (dxf.entities) {
        dxf.entities.forEach(entity => {
            if (entity.layer) {
                layers.add(entity.layer);
            }
        });
    }

    return Array.from(layers);
}

function extractEntitiesByLayerPattern(dxf, patterns) {
    if (!dxf.entities) return [];

    return dxf.entities.filter(entity => {
        if (!entity.layer) return false;

        const layerName = entity.layer.toUpperCase();
        return patterns.some(pattern => layerName.includes(pattern.toUpperCase()));
    });
}

// ============================================
// DIMENSION MEASUREMENT
// ============================================

function measureEntity(entity) {
    const type = entity.type;

    switch (type) {
        case 'LWPOLYLINE':
        case 'POLYLINE':
            return measurePolyline(entity);

        case 'LINE':
            return measureLine(entity);

        case 'CIRCLE':
            return measureCircle(entity);

        case 'ARC':
            return measureArc(entity);

        case 'RECTANGLE':
        case 'INSERT':
            return measureInsert(entity);

        default:
            return null;
    }
}

function measurePolyline(entity) {
    const vertices = entity.vertices || [];

    if (vertices.length < 2) return null;

    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    vertices.forEach(v => {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
    });

    const width = Math.abs(maxX - minX);
    const height = Math.abs(maxY - minY);

    // Check if it's a rectangle (closed polyline with 4-5 vertices)
    const isClosed = entity.shape || (vertices.length >= 4 && vertices.length <= 5);

    if (isClosed && vertices.length >= 4) {
        return {
            type: 'rectangle',
            width: Math.round(width * 100), // convert to cm
            height: Math.round(height * 100),
            area: width * height,
            perimeter: 2 * (width + height)
        };
    }

    return {
        type: 'polyline',
        width: Math.round(width * 100),
        height: Math.round(height * 100),
        length: calculatePolylineLength(vertices)
    };
}

function measureLine(entity) { if (entity.start && entity.end) { const dx = entity.end.x - entity.start.x; const dy = entity.end.y - entity.start.y; const length = Math.sqrt(dx * dx + dy * dy); return { type: 'line', length: Math.round(length * 100) }; } return null; };
}

function measureCircle(entity) {
    const radius = entity.radius || 0;
    const diameter = radius * 2;

    return {
        type: 'circle',
        diameter: Math.round(diameter * 100), // cm
        radius: Math.round(radius * 100)
    };
}

function measureArc(entity) {
    const radius = entity.radius || 0;
    return {
        type: 'arc',
        radius: Math.round(radius * 100)
    };
}

function measureInsert(entity) {
    // For INSERT (block references), try to get dimensions from attributes
    return {
        type: 'insert',
        name: entity.name || 'Unknown'
    };
}

function calculatePolylineLength(vertices) {
    let totalLength = 0;

    for (let i = 0; i < vertices.length - 1; i++) {
        const v1 = vertices[i];
        const v2 = vertices[i + 1];
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        totalLength += Math.sqrt(dx * dx + dy * dy);
    }

    return Math.round(totalLength * 100); // cm
}

// ============================================
// ELEMENT CLASSIFICATION
// ============================================

function classifyElements(entities, elementType) {
    if (!entities || entities.length === 0) {
        return [];
    }

    // Measure all entities
    const measuredElements = entities
        .map(entity => measureEntity(entity))
        .filter(m => m !== null);

    if (measuredElements.length === 0) {
        return [];
    }

    // Group by similar dimensions
    const groups = [];

    measuredElements.forEach(element => {
        let found = false;

        for (let group of groups) {
            if (areSimilarDimensions(element, group.reference, elementType)) {
                group.count++;
                found = true;
                break;
            }
        }

        if (!found) {
            groups.push({
                reference: element,
                count: 1
            });
        }
    });

    // Sort by count (most common first)
    groups.sort((a, b) => b.count - a.count);

    // Format results based on element type
    return groups.map((group, index) => {
        return formatElementGroup(group, index, elementType);
    });
}

function areSimilarDimensions(elem1, elem2, elementType) {
    const tolerance = DIMENSION_TOLERANCE;

    if (elementType === 'column') {
        // For columns, compare width and height
        if (elem1.width && elem2.width && elem1.height && elem2.height) {
            const widthDiff = Math.abs(elem1.width - elem2.width);
            const heightDiff = Math.abs(elem1.height - elem2.height);
            return widthDiff <= tolerance && heightDiff <= tolerance;
        }

        // For circular columns
        if (elem1.diameter && elem2.diameter) {
            return Math.abs(elem1.diameter - elem2.diameter) <= tolerance;
        }
    }

    if (elementType === 'wall') {
        // For walls, compare thickness and length
        if (elem1.width && elem2.width) {
            const thickness1 = Math.min(elem1.width, elem1.height || elem1.width);
            const thickness2 = Math.min(elem2.width, elem2.height || elem2.width);
            return Math.abs(thickness1 - thickness2) <= tolerance;
        }
    }

    if (elementType === 'core') {
        // For cores, compare overall dimensions
        if (elem1.width && elem2.width && elem1.height && elem2.height) {
            const widthDiff = Math.abs(elem1.width - elem2.width);
            const heightDiff = Math.abs(elem1.height - elem2.height);
            return widthDiff <= tolerance * 10 && heightDiff <= tolerance * 10; // Larger tolerance for cores
        }
    }

    return false;
}

function formatElementGroup(group, index, elementType) {
    const ref = group.reference;

    if (elementType === 'column') {
        if (ref.type === 'circle') {
            return {
                type: `K${index + 1}`,
                width: ref.diameter,
                depth: ref.diameter,
                shape: 'Dairesel',
                count: group.count
            };
        } else {
            return {
                type: `K${index + 1}`,
                width: Math.min(ref.width, ref.height),
                depth: Math.max(ref.width, ref.height),
                shape: 'Dikdörtgen',
                count: group.count
            };
        }
    }

    if (elementType === 'wall') {
        const thickness = Math.min(ref.width, ref.height || ref.width);
        const length = Math.max(ref.width, ref.height || ref.width);

        return {
            type: `P${index + 1}`,
            thickness: thickness,
            length: (length / 100).toFixed(2), // convert cm to m
            height: 3.0, // Default height
            count: group.count
        };
    }

    if (elementType === 'core') {
        const wallThickness = 30; // Default wall thickness

        return {
            type: `Ç${index + 1}`,
            width: (ref.width / 100).toFixed(2), // convert cm to m
            depth: (ref.height / 100).toFixed(2),
            wallThickness: wallThickness,
            count: group.count
        };
    }

    return null;
}

// ============================================
// RESULTS DISPLAY
// ============================================

function displayResults(results) {
    const { columns, walls, cores } = results;

    // Update summary cards
    document.getElementById('columnCount').textContent = columns.length;
    document.getElementById('wallCount').textContent = walls.length;
    document.getElementById('coreCount').textContent = cores.length;

    const totalElements = columns.length + walls.length + cores.length;
    document.getElementById('totalElements').textContent = totalElements;

    // Populate columns table
    const columnsTableBody = document.getElementById('columnsTableBody');
    columnsTableBody.innerHTML = '';

    if (columns.length === 0) {
        columnsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Kolon bulunamadı</td></tr>';
    } else {
        columns.forEach((col, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${col.type}</strong></td>
                <td>${col.width} × ${col.depth} cm</td>
                <td>${col.width}</td>
                <td>${col.depth}</td>
                <td><span style="color: var(--primary-blue-light); font-weight: 600;">${col.count}</span></td>
            `;
            columnsTableBody.appendChild(row);
        });
    }

    // Populate walls table
    const wallsTableBody = document.getElementById('wallsTableBody');
    wallsTableBody.innerHTML = '';

    if (walls.length === 0) {
        wallsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Perde duvar bulunamadı</td></tr>';
    } else {
        walls.forEach((wall, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${wall.type}</strong></td>
                <td>${wall.thickness}</td>
                <td>${wall.length}</td>
                <td>${wall.height.toFixed(1)}</td>
                <td><span style="color: var(--purple-light); font-weight: 600;">${wall.count}</span></td>
            `;
            wallsTableBody.appendChild(row);
        });
    }

    // Populate cores table
    const coresTableBody = document.getElementById('coresTableBody');
    coresTableBody.innerHTML = '';

    if (cores.length === 0) {
        coresTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Çekirdek bulunamadı</td></tr>';
    } else {
        cores.forEach((core, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${core.type}</strong></td>
                <td>${core.width}</td>
                <td>${core.depth}</td>
                <td>${core.wallThickness}</td>
                <td><span style="color: var(--orange-light); font-weight: 600;">${core.count}</span></td>
            `;
            coresTableBody.appendChild(row);
        });
    }

    // Create chart
    createDistributionChart(results);
}

function createDistributionChart(results) {
    const { columns, walls, cores } = results;

    const totalColumns = columns.reduce((sum, col) => sum + col.count, 0);
    const totalWalls = walls.reduce((sum, wall) => sum + wall.count, 0);
    const totalCores = cores.reduce((sum, core) => sum + core.count, 0);

    const ctx = document.getElementById('distributionChart').getContext('2d');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Kolonlar', 'Perde Duvarlar', 'Çekirdekler'],
            datasets: [{
                data: [totalColumns, totalWalls, totalCores],
                backgroundColor: [
                    'rgba(37, 99, 235, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                ],
                borderColor: [
                    'rgba(37, 99, 235, 1)',
                    'rgba(139, 92, 246, 1)',
                    'rgba(245, 158, 11, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#cbd5e1',
                        font: { size: 14, family: 'Inter' },
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} adet (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function exportToPDF() {
    showToast('PDF indirme özelliği yakında eklenecek...', 'success');
}

function exportToExcel() {
    if (!analysisResults) return;

    showToast('Excel dosyası hazırlanıyor...', 'success');

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // BOM for Turkish characters

    csvContent += 'KOLONLAR\n';
    csvContent += 'Tip,Kesit Boyutu,Genislik (cm),Derinlik (cm),Adet\n';
    analysisResults.columns.forEach(col => {
        csvContent += `${col.type},${col.width}x${col.depth},${col.width},${col.depth},${col.count}\n`;
    });

    csvContent += '\nPERDE DUVARLAR\n';
    csvContent += 'Tip,Kalinlik (cm),Uzunluk (m),Yukseklik (m),Adet\n';
    analysisResults.walls.forEach(wall => {
        csvContent += `${wall.type},${wall.thickness},${wall.length},${wall.height},${wall.count}\n`;
    });

    csvContent += '\nCEKIRDEKLER\n';
    csvContent += 'Tip,Genislik (m),Derinlik (m),Duvar Kalinligi (cm),Adet\n';
    analysisResults.cores.forEach(core => {
        csvContent += `${core.type},${core.width},${core.depth},${core.wallThickness},${core.count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `yapisal_analiz_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Excel dosyası indirildi!', 'success');
}

function resetAnalysis() {
    uploadedFile = null;
    analysisResults = null;
    dxfData = null;

    fileInput.value = '';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';

    resultsSection.classList.add('hidden');
    loadingSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Yeni analiz için dosya yükleyebilirsiniz', 'success');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function updateProgress(text, percentage) {
    loadingText.textContent = text;
    progressFill.style.width = percentage + '%';
    progressText.textContent = percentage + '%';
    await sleep(300);
}

function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.classList.remove('error');

    if (type === 'error') {
        toast.classList.add('error');
    }

    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DWG Yapısal Analiz Uygulaması (Profesyonel DXF Parser) hazır!');
    console.log('Desteklenen layer adları:', LAYER_PATTERNS);
});

