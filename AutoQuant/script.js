// ============================================
// DWG YAPISAL ANALİZ - PROFESSIONAL DXF PARSER
// ============================================

// Global variables
let uploadedFile = null;
let analysisResults = null;
let dxfData = null;
let layerCategoryMap = null; // stores which layers belong to which category
let entityGroupMap = new Map(); // maps entity index → { category, typeName, displaySize }

// Multi-floor state
let floors = []; // { id, name, dxfData, results, height, zOffset, layerCategoryMap, entityGroupMap }
let isMultiFloorMode = false;

// Layer name patterns for classification
const LAYER_PATTERNS = {
    columns: ['KOLON', 'COLUMN', 'COL', 'SUTUN'],
    walls: ['PERDE', 'WALL', 'SHEARWALL', 'DUVAR'],
    cores: ['CEKIRDEK', 'CORE', 'ASANSOR', 'ELEVATOR', 'MERDIVEN', 'STAIR']
};

// DXF unit scale factor: DXF files are in mm, divide by 10 to get cm
const DXF_TO_CM = 0.1;

// Tolerance for dimension comparison (cm)
const DIMENSION_TOLERANCE = 1;

// ============================================
// DXF PREVIEW - CANVAS STATE
// ============================================
let previewState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    highlightedType: null, // e.g. 'K1', 'P2', 'Ç1' — null means no highlight
    showLabels: true,
    viewMode: '2D' // '2D' or '3D'
};

// ============================================
// THREE.JS STATE
// ============================================
let threeState = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    objects: [], // List of Mesh objects
    isInitialized: false,
    raycaster: null,
    mouse: null
};

// ============================================
// THEME MANAGEMENT
// ============================================

function initTheme() {
    const saved = localStorage.getItem('dwg-theme') || 'dark';
    applyTheme(saved);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dwg-theme', theme);

    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');

    if (icon && label) {
        if (theme === 'dark') {
            icon.className = 'fas fa-moon';
            label.textContent = t('darkMode');
        } else {
            icon.className = 'fas fa-sun';
            label.textContent = t('lightMode');
        }
    }

    // Re-render 3D if initialized
    if (threeState.isInitialized) {
        const isDark = theme !== 'light';
        threeState.scene.background = new THREE.Color(isDark ? 0x0c1222 : 0xf1f5f9);
        update3DScene();
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);

    // Re-render preview
    if (dxfData && layerCategoryMap) {
        renderDxfPreview();
    }
}

// ============================================
// DOM ELEMENTS
// ============================================

const mainEl = document.querySelector('.main');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');

// Toggle viewport-fit mode (centered upload screen vs scrollable content)
function setViewportMode(isUploadOnly) {
    if (isUploadOnly) {
        mainEl.classList.add('main-viewport');
        document.body.classList.add('no-scroll');
    } else {
        mainEl.classList.remove('main-viewport');
        document.body.classList.remove('no-scroll');
    }
}
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
const exportExcelBtn = document.getElementById('exportExcelBtn');
const export3dDxfBtn = document.getElementById('export3dDxfBtn');
const newAnalysisBtn = document.getElementById('newAnalysisBtn');
const addFloorBtn = document.getElementById('addFloorBtn');
const floorManagementSection = document.getElementById('floorManagementSection');
const floorTableBody = document.getElementById('floorTableBody');

// Theme toggle
const themeToggleBtn = document.getElementById('themeToggleBtn');

// ============================================
// EVENT LISTENERS
// ============================================

selectFileBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent dropArea click from also firing
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFileUpload(file);
        // Reset input so selecting the same file again triggers change event
        fileInput.value = '';
    }
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

exportExcelBtn.addEventListener('click', exportToExcel);
export3dDxfBtn.addEventListener('click', exportTo3DDXF);
newAnalysisBtn.addEventListener('click', resetAnalysis);
addFloorBtn.addEventListener('click', saveAndAddAnotherFloor);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
}

// Layer selection buttons
document.getElementById('analyzeLayersBtn').addEventListener('click', performAnalysis);
document.getElementById('cancelLayerSelectionBtn').addEventListener('click', () => {
    document.getElementById('layerSelectionSection').classList.add('hidden');
    uploadSection.classList.remove('hidden');
    dxfData = null;
});

// Preview controls
document.getElementById('zoomInBtn').addEventListener('click', () => {
    previewState.zoom = Math.min(previewState.zoom * 1.3, 20);
    renderDxfPreview();
});
document.getElementById('zoomOutBtn').addEventListener('click', () => {
    previewState.zoom = Math.max(previewState.zoom / 1.3, 0.1);
    renderDxfPreview();
});
document.getElementById('resetViewBtn').addEventListener('click', () => {
    previewState.zoom = 1;
    previewState.panX = 0;
    previewState.panY = 0;
    renderDxfPreview();
});

// Toggle dimension labels
document.getElementById('toggleLabelsBtn').addEventListener('click', () => {
    previewState.showLabels = !previewState.showLabels;
    const btn = document.getElementById('toggleLabelsBtn');
    btn.style.opacity = previewState.showLabels ? '1' : '0.5';
    renderDxfPreview();
});

// Clear highlight
document.getElementById('clearHighlightBtn').addEventListener('click', () => {
    previewState.highlightedType = null;
    document.querySelectorAll('.clickable-row').forEach(row => row.classList.remove('row-highlighted'));
    document.getElementById('clearHighlightBtn').classList.add('hidden');
    renderDxfPreview();
    if (threeState.isInitialized) updateThreeHighlight();
});

// 2D/3D View Selection
document.getElementById('view2dBtn').addEventListener('click', () => switchViewMode('2D'));
document.getElementById('view3dBtn').addEventListener('click', () => switchViewMode('3D'));

// Floor height change
document.getElementById('floorHeightInput').addEventListener('change', () => {
    if (previewState.viewMode === '3D') {
        update3DScene();
    }
});

// Canvas pan & zoom
const dxfCanvas = document.getElementById('dxfCanvas');

dxfCanvas.addEventListener('mousedown', (e) => {
    previewState.isDragging = true;
    previewState.lastMouseX = e.clientX;
    previewState.lastMouseY = e.clientY;
    dxfCanvas.style.cursor = 'grabbing';
});

dxfCanvas.addEventListener('mousemove', (e) => {
    if (!previewState.isDragging) return;
    const dx = e.clientX - previewState.lastMouseX;
    const dy = e.clientY - previewState.lastMouseY;
    previewState.panX += dx;
    previewState.panY += dy;
    previewState.lastMouseX = e.clientX;
    previewState.lastMouseY = e.clientY;
    renderDxfPreview();
});

dxfCanvas.addEventListener('mouseup', () => {
    previewState.isDragging = false;
    dxfCanvas.style.cursor = 'grab';
});

dxfCanvas.addEventListener('mouseleave', () => {
    previewState.isDragging = false;
    dxfCanvas.style.cursor = 'grab';
});

dxfCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    previewState.zoom = Math.min(Math.max(previewState.zoom * factor, 0.05), 50);
    renderDxfPreview();
});

// Touch support for mobile
dxfCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        previewState.isDragging = true;
        previewState.lastMouseX = e.touches[0].clientX;
        previewState.lastMouseY = e.touches[0].clientY;
    }
});

dxfCanvas.addEventListener('touchmove', (e) => {
    if (!previewState.isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - previewState.lastMouseX;
    const dy = e.touches[0].clientY - previewState.lastMouseY;
    previewState.panX += dx;
    previewState.panY += dy;
    previewState.lastMouseX = e.touches[0].clientX;
    previewState.lastMouseY = e.touches[0].clientY;
    renderDxfPreview();
}, { passive: false });

dxfCanvas.addEventListener('touchend', () => {
    previewState.isDragging = false;
});

// ============================================
// FILE HANDLING
// ============================================

function handleFileUpload(file) {
    const fileName = file.name.toLowerCase();

    // Validate file type
    if (!fileName.endsWith('.dxf') && !fileName.endsWith('.dwg')) {
        showToast(t('errorSelectDxf'), 'error');
        return;
    }

    // For now, only DXF is supported
    if (fileName.endsWith('.dwg')) {
        showToast(t('errorConvertDwg'), 'error');
        return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
        showToast(t('errorFileSize'), 'error');
        return;
    }

    uploadedFile = file;
    showToast(`${file.name} ${t('fileUploaded')}`, 'success');
    setTimeout(() => analyzeFile(file), 500);
}

// ============================================
// DXF FILE ANALYSIS
// ============================================

async function analyzeFile(file) {
    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    setViewportMode(false);

    try {
        // Step 1: Read file
        await updateProgress(t('progressReading'), 30);
        const fileContent = await file.text();

        // Step 2: Parse DXF
        await updateProgress(t('progressParsing'), 60);
        dxfData = await parseDXF(fileContent);

        if (!dxfData) {
            throw new Error(t('errorParseFailed'));
        }

        // Step 3: Extract layers and show selection UI
        await updateProgress(t('progressListingLayers'), 100);
        await sleep(300);

        showLayerSelection(dxfData);

    } catch (error) {
        console.error('Analiz hatası:', error);
        showToast(`Hata: ${error.message}`, 'error');
        loadingSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    }
}

function showLayerSelection(dxf) {
    loadingSection.classList.add('hidden');

    // Extract layers with entity counts
    const layerInfo = {};

    if (dxf.entities) {
        dxf.entities.forEach(entity => {
            const layerName = entity.layer || 'Varsayılan';
            if (!layerInfo[layerName]) {
                layerInfo[layerName] = { name: layerName, count: 0 };
            }
            layerInfo[layerName].count++;
        });
    }

    const layers = Object.values(layerInfo);

    if (layers.length === 0) {
        showToast(t('errorNoLayer'), 'error');
        uploadSection.classList.remove('hidden');
        return;
    }

    console.log('Bulunan katmanlar:', layers);

    // Populate layer table
    const layerTableBody = document.getElementById('layerTableBody');
    layerTableBody.innerHTML = '';

    layers.forEach(layer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${layer.name}</td>
            <td>${layer.count}</td>
            <td>
                <select class="layer-category-select" data-layer="${layer.name}">
                    <option value="">${t('noSelection')}</option>
                    <option value="column">${t('columnCat')}</option>
                    <option value="wall">${t('wallCat')}</option>
                    <option value="core">${t('coreCat')}</option>
                    <option value="beam">${t('beamCat')}</option>
                    <option value="slab">${t('slabCat')}</option>
                    <option value="thicknessText">${t('thicknessTextCat')}</option>
                </select>
            </td>
        `;
        layerTableBody.appendChild(row);
    });

    document.getElementById('layerSelectionSection').classList.remove('hidden');
}

function performAnalysis() {
    const selects = document.querySelectorAll('.layer-category-select');
    const layerCategories = {
        columns: [],
        walls: [],
        cores: [],
        beams: [],
        slabs: [],
        thicknessTexts: []
    };

    // Collect user selections
    selects.forEach(select => {
        const layerName = select.getAttribute('data-layer');
        const category = select.value;

        if (category === 'column') {
            layerCategories.columns.push(layerName);
        } else if (category === 'wall') {
            layerCategories.walls.push(layerName);
        } else if (category === 'core') {
            layerCategories.cores.push(layerName);
        } else if (category === 'beam') {
            layerCategories.beams.push(layerName);
        } else if (category === 'slab') {
            layerCategories.slabs.push(layerName);
        } else if (category === 'thicknessText') {
            layerCategories.thicknessTexts.push(layerName);
        }
    });

    // Check if at least one category is selected
    const totalSelected = layerCategories.columns.length +
        layerCategories.walls.length +
        layerCategories.cores.length +
        layerCategories.beams.length +
        layerCategories.slabs.length +
        layerCategories.thicknessTexts.length;

    if (totalSelected === 0) {
        showToast(t('errorSelectLayer'), 'error');
        return;
    }

    // Save layer category map for preview
    layerCategoryMap = layerCategories;

    // Hide layer selection
    document.getElementById('layerSelectionSection').classList.add('hidden');
    loadingSection.classList.remove('hidden');

    setTimeout(() => analyzeWithCategories(layerCategories), 300);
}

async function analyzeWithCategories(layerCategories) {
    try {
        await updateProgress(t('progressAnalyzing'), 30);

        //Extract entities by selected layers
        const columnEntities = extractEntitiesByLayers(dxfData, layerCategories.columns);
        const wallEntities = extractEntitiesByLayers(dxfData, layerCategories.walls);
        const coreEntities = extractEntitiesByLayers(dxfData, layerCategories.cores);
        const beamEntities = extractEntitiesByLayers(dxfData, layerCategories.beams || []);
        const slabEntities = extractEntitiesByLayers(dxfData, layerCategories.slabs || []);

        await updateProgress(t('progressMeasuring'), 70);

        // Extract thicknesses from specified layers
        const thicknessTexts = extractThicknessFromTexts(dxfData, layerCategories.thicknessTexts);

        // Measure and classify
        const columns = classifyElements(columnEntities, 'column');
        const walls = classifyElements(wallEntities, 'wall');
        const cores = classifyElements(coreEntities, 'core');
        const beams = classifyElements(beamEntities, 'beam', thicknessTexts);
        const slabs = classifyElements(slabEntities, 'slab', thicknessTexts);

        analysisResults = { columns, walls, cores, beams, slabs };

        await updateProgress(t('progressPreparing'), 100);
        await sleep(300);

        loadingSection.classList.add('hidden');
        displayResults();
        resultsSection.classList.remove('hidden');

        // Render DXF preview
        renderDxfPreview();

        showToast(t('analysisComplete'), 'success');

    } catch (error) {
        console.error('Analiz hatası:', error);
        showToast(`Hata: ${error.message}`, 'error');
        loadingSection.classList.remove('hidden');
        document.getElementById('layerSelectionSection').classList.remove('hidden');
    }
}

// ============================================
// DXF PARSING
// ============================================

async function parseDXF(content) {
    try {
        // Using dxf-parser library (loaded via CDN)
        if (typeof DxfParser === 'undefined') {
            throw new Error(t('errorParserNotLoaded'));
        }

        const parser = new DxfParser();
        const dxf = parser.parseSync(content);

        if (!dxf || !dxf.entities) {
            throw new Error(t('errorInvalidDxf'));
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

function extractEntitiesByLayers(dxf, layerNames) {
    if (!dxf.entities || !layerNames || layerNames.length === 0) return [];

    return dxf.entities.filter(entity => {
        if (!entity.layer) return false;
        return layerNames.includes(entity.layer);
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

    // Calculate total perimeter from all edges
    let totalPerimeter = calculatePolylineLength(vertices);
    // Auto-close logic: if distance between first and last is small, treat as closed
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    const distSq = Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2);
    const GAP_THRESHOLD = 1.0; // 1mm threshold for auto-closing
    const isAutoClosed = distSq > 0 && distSq <= Math.pow(GAP_THRESHOLD, 2);

    const isClosed = entity.shape || isAutoClosed || (vertices.length >= 4 && vertices.length <= 5);

    if (isClosed && vertices.length >= 3) {
        const dist = Math.sqrt(distSq);
        // Only add closing segment if last vertex != first vertex and it's not already extremely close
        if (dist > 0.1) {
            totalPerimeter += Math.round(dist * DXF_TO_CM);
        }
    }

    if (isClosed && vertices.length >= 4) {
        return {
            type: 'rectangle',
            width: Math.round(width * DXF_TO_CM), // mm to cm
            height: Math.round(height * DXF_TO_CM),
            area: width * height,
            perimeter: totalPerimeter // already in cm
        };
    }

    return {
        type: 'polyline',
        width: Math.round(width * DXF_TO_CM),
        height: Math.round(height * DXF_TO_CM),
        length: calculatePolylineLength(vertices),
        perimeter: totalPerimeter
    };
}

function measureLine(entity) {
    if (entity.start && entity.end) {
        const dx = entity.end.x - entity.start.x;
        const dy = entity.end.y - entity.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        return {
            type: 'line',
            length: Math.round(length * DXF_TO_CM)
        };
    }
    return null;
}

function measureCircle(entity) {
    const radius = entity.radius || 0;
    const diameter = radius * 2;

    return {
        type: 'circle',
        diameter: Math.round(diameter * DXF_TO_CM), // mm to cm
        radius: Math.round(radius * DXF_TO_CM),
        perimeter: Math.round(2 * Math.PI * radius * DXF_TO_CM)
    };
}

function measureArc(entity) {
    const radius = entity.radius || 0;
    return {
        type: 'arc',
        radius: Math.round(radius * DXF_TO_CM)
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

    return Math.round(totalLength * DXF_TO_CM); // mm to cm
}

// ============================================
// ELEMENT CLASSIFICATION
// ============================================

function classifyElements(entities, elementType, thicknessTexts = []) {
    if (!entities || entities.length === 0) {
        return [];
    }

    // Measure all entities, keep entity references
    const measuredElements = [];
    entities.forEach((entity, idx) => {
        const m = measureEntity(entity);
        if (m !== null) {
            // Find assigned thickness text inside this polyline
            let assignedThickness = null;
            if ((elementType === 'slab' || elementType === 'beam') && thicknessTexts.length > 0) {
                const vertices = entity.vertices || [];
                if (vertices.length >= 3) {
                    const foundText = thicknessTexts.find(t => isPointInPolyline(t, vertices));
                    if (foundText) assignedThickness = foundText.thickness;
                }
            }
            measuredElements.push({ measurement: m, entity, assignedThickness });
        }
    });

    if (measuredElements.length === 0) {
        return [];
    }

    // Group by similar dimensions AND assigned thickness
    const groups = [];

    measuredElements.forEach(({ measurement, entity, assignedThickness }) => {
        let found = false;

        for (let group of groups) {
            const sameThickness = assignedThickness === group.assignedThickness;
            if (sameThickness && areSimilarDimensions(measurement, group.reference, elementType)) {
                group.count++;
                group.entities.push(entity);
                found = true;
                break;
            }
        }

        if (!found) {
            groups.push({
                reference: measurement,
                assignedThickness,
                count: 1,
                entities: [entity]
            });
        }
    });

    // Sort by count (most common first)
    groups.sort((a, b) => b.count - a.count);

    // Format results based on element type and build entity-to-group map
    return groups.map((group, index) => {
        const formatted = formatElementGroup(group, index, elementType);

        // Map each entity to its group type for preview labeling & highlighting
        if (formatted) {
            const category = elementType;
            group.entities.forEach(ent => {
                const entIdx = dxfData.entities.indexOf(ent);
                if (entIdx !== -1) {
                    entityGroupMap.set(entIdx, {
                        category,
                        typeName: formatted.type,
                        displaySize: formatted.displaySize || `${formatted.totalLength || formatted.area} unit`,
                        thickness: group.assignedThickness
                    });
                }
            });
        }

        return formatted;
    });
}

function areSimilarDimensions(elem1, elem2, elementType) {
    const tolerance = DIMENSION_TOLERANCE;

    if (elementType === 'column') {
        // For columns, compare width and height (normalize to min/max first)
        if (elem1.width && elem2.width && elem1.height && elem2.height) {
            const width1 = Math.min(elem1.width, elem1.height);
            const height1 = Math.max(elem1.width, elem1.height);
            const width2 = Math.min(elem2.width, elem2.height);
            const height2 = Math.max(elem2.width, elem2.height);

            const widthDiff = Math.abs(width1 - width2);
            const heightDiff = Math.abs(height1 - height2);
            return widthDiff <= tolerance && heightDiff <= tolerance;
        }

        // For circular columns
        if (elem1.diameter && elem2.diameter) {
            return Math.abs(elem1.diameter - elem2.diameter) <= tolerance;
        }
    }

    if (elementType === 'wall') {
        // For walls, compare thickness and length
        if (elem1.width && elem2.width && elem1.height && elem2.height) {
            const width1 = Math.min(elem1.width, elem1.height);
            const height1 = Math.max(elem1.width, elem1.height);
            const width2 = Math.min(elem2.width, elem2.height);
            const height2 = Math.max(elem2.width, elem2.height);

            const widthDiff = Math.abs(width1 - width2);
            const heightDiff = Math.abs(height1 - height2);
            return widthDiff <= tolerance && heightDiff <= tolerance;
        }
    }

    if (elementType === 'core') {
        // For cores, compare overall dimensions (normalize to min/max first)
        if (elem1.width && elem2.width && elem1.height && elem2.height) {
            const width1 = Math.min(elem1.width, elem1.height);
            const height1 = Math.max(elem1.width, elem1.height);
            const width2 = Math.min(elem2.width, elem2.height);
            const height2 = Math.max(elem2.width, elem2.height);

            const widthDiff = Math.abs(width1 - width2);
            const heightDiff = Math.abs(height1 - height2);
            return widthDiff <= tolerance * 10 && heightDiff <= tolerance * 10; // Larger tolerance for cores
        }
    }

    return false;
}

function formatElementGroup(group, index, elementType) {
    const ref = group.reference;
    const thickness = group.assignedThickness || 20;

    if (elementType === 'column') {
        if (ref.type === 'circle') {
            return {
                type: `K${index + 1}`,
                width: ref.diameter,
                depth: ref.diameter,
                displaySize: `Ø${ref.diameter} cm`,
                shape: t('circular'),
                isCircular: true,
                count: group.count
            };
        } else {
            const w = Math.min(ref.width, ref.height);
            const d = Math.max(ref.width, ref.height);
            return {
                type: `K${index + 1}`,
                width: w,
                depth: d,
                displaySize: `${w} × ${d} cm`,
                shape: t('rectangular'),
                isCircular: false,
                count: group.count
            };
        }
    }

    if (elementType === 'wall') {
        const perimeterCm = ref.perimeter || (2 * ((ref.width || 0) + (ref.height || 0)));
        const totalLengthM = (perimeterCm / 100).toFixed(2);

        return {
            type: `P${index + 1}`,
            totalLength: totalLengthM,
            count: group.count
        };
    }

    if (elementType === 'core') {
        const perimeterCm = ref.perimeter || (2 * ((ref.width || 0) + (ref.height || 0)));
        const totalLengthM = (perimeterCm / 100).toFixed(2);

        return {
            type: `Ç${index + 1}`,
            totalLength: totalLengthM,
            count: group.count
        };
    }

    if (elementType === 'beam') {
        const b = Math.min(ref.width || 0, ref.height || 0) || 25;
        const h = thickness;
        const perimeterCm = ref.perimeter || (2 * ((ref.width || 0) + (ref.height || 0)));
        const totalLengthM = (perimeterCm / 100 / 2).toFixed(2);

        return {
            type: `Kiriş-${index + 1}`,
            displaySize: `${b}/${h} cm`,
            totalLength: totalLengthM,
            count: group.count,
            thickness: h
        };
    }

    if (elementType === 'slab') {
        const areaM2 = (ref.area / 10000).toFixed(2);

        return {
            type: `Döşeme-${index + 1}`,
            displaySize: `${thickness} cm`,
            area: areaM2,
            count: group.count,
            thickness: thickness
        };
    }

    return null;
}

// ============================================
// DXF 2D PREVIEW RENDERER
// ============================================

function getEntityCategory(entity, overrideMap) {
    const map = overrideMap || layerCategoryMap;
    if (!entity.layer || !map) return 'other';

    if (map.columns && map.columns.includes(entity.layer)) return 'column';
    if (map.walls && map.walls.includes(entity.layer)) return 'wall';
    if (map.cores && map.cores.includes(entity.layer)) return 'core';
    if (map.beams && map.beams.includes(entity.layer)) return 'beam';
    if (map.slabs && map.slabs.includes(entity.layer)) return 'slab';
    return 'other';
}

function getCategoryColor(category, isDark) {
    switch (category) {
        case 'column': return isDark ? '#3b82f6' : '#2563eb';
        case 'wall': return isDark ? '#a78bfa' : '#7c3aed';
        case 'core': return isDark ? '#5eead4' : '#14b8a6';
        case 'beam': return isDark ? '#fbbf24' : '#f59e0b';
        case 'slab': return isDark ? '#ec4899' : '#db2777';
        default: return isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(100, 116, 139, 0.25)';
    }
}

function getCategoryLineWidth(category) {
    switch (category) {
        case 'column': return 2.5;
        case 'wall': return 2;
        case 'core': return 2;
        case 'beam': return 1.5;
        case 'slab': return 1;
        default: return 0.5;
    }
}

function renderDxfPreview() {
    if (!dxfData || !dxfData.entities) return;

    const canvas = document.getElementById('dxfCanvas');
    const wrapper = canvas.parentElement;
    const rect = wrapper.getBoundingClientRect();

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Determine theme
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    ctx.fillStyle = isDark ? '#0c1222' : '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Draw subtle grid
    drawGrid(ctx, w, h, isDark);

    // Calculate bounding box of all entities
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    dxfData.entities.forEach(entity => {
        const bounds = getEntityBounds(entity);
        if (bounds) {
            minX = Math.min(minX, bounds.minX);
            maxX = Math.max(maxX, bounds.maxX);
            minY = Math.min(minY, bounds.minY);
            maxY = Math.max(maxY, bounds.maxY);
        }
    });

    if (!isFinite(minX)) return;

    const dxfWidth = maxX - minX;
    const dxfHeight = maxY - minY;
    if (dxfWidth === 0 && dxfHeight === 0) return;

    // Calculate scale to fit canvas (with padding)
    const padding = 40;
    const scaleX = (w - 2 * padding) / (dxfWidth || 1);
    const scaleY = (h - 2 * padding) / (dxfHeight || 1);
    const baseScale = Math.min(scaleX, scaleY);

    // Apply zoom & pan
    const scale = baseScale * previewState.zoom;
    const centerX = w / 2 + previewState.panX;
    const centerY = h / 2 + previewState.panY;
    const dxfCenterX = (minX + maxX) / 2;
    const dxfCenterY = (minY + maxY) / 2;

    // Transform function: DXF coords → canvas coords
    const toCanvasX = (x) => centerX + (x - dxfCenterX) * scale;
    const toCanvasY = (y) => centerY - (y - dxfCenterY) * scale; // flip Y

    // Sort: draw 'other' first, then classified
    const sortedEntities = [...dxfData.entities].sort((a, b) => {
        const catA = getEntityCategory(a);
        const catB = getEntityCategory(b);
        if (catA === 'other' && catB !== 'other') return -1;
        if (catA !== 'other' && catB === 'other') return 1;
        return 0;
    });

    const highlighted = previewState.highlightedType;

    // Draw entities (two passes if highlighting: dim first, bright second)
    sortedEntities.forEach(entity => {
        const category = getEntityCategory(entity);
        const entIdx = dxfData.entities.indexOf(entity);
        const groupInfo = entityGroupMap.get(entIdx);
        const typeName = groupInfo ? groupInfo.typeName : null;

        // Determine if dimmed
        let dimmed = false;
        if (highlighted) {
            dimmed = (typeName !== highlighted);
        }

        const color = getCategoryColor(category, isDark);
        const lineWidth = getCategoryLineWidth(category);

        if (dimmed) {
            ctx.globalAlpha = 0.12;
        } else {
            ctx.globalAlpha = 1.0;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = dimmed ? 0.5 : lineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // If highlighted and this is THE highlighted type, add glow
        if (highlighted && typeName === highlighted) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }

        drawEntity(ctx, entity, toCanvasX, toCanvasY, scale, category, isDark, dimmed);
    });

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    // Draw dimension labels (feature 24)
    if (previewState.showLabels && previewState.zoom >= 0.6) {
        drawAllDimensionLabels(ctx, toCanvasX, toCanvasY, scale, isDark);
    }

    // Draw compass
    drawCompass(ctx, w, h, isDark);

    // Draw highlight indicator
    if (highlighted) {
        drawHighlightBadge(ctx, w, isDark, highlighted);
    }
}

function drawGrid(ctx, w, h, isDark) {
    const gridColor = isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(203, 213, 225, 0.5)';
    const gridStep = 50;

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;

    for (let x = 0; x < w; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }

    for (let y = 0; y < h; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
}

function drawCompass(ctx, w, h, isDark) {
    const cx = w - 40;
    const cy = h - 40;
    const r = 18;
    const color = isDark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.5)';

    // Circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    // N arrow
    ctx.beginPath();
    ctx.moveTo(cx, cy - r + 3);
    ctx.lineTo(cx - 4, cy - 4);
    ctx.lineTo(cx + 4, cy - 4);
    ctx.closePath();
    ctx.fillStyle = isDark ? '#3b82f6' : '#2563eb';
    ctx.fill();

    // N label
    ctx.fillStyle = color;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - r - 5);
}

function getEntityBounds(entity) {
    switch (entity.type) {
        case 'LWPOLYLINE':
        case 'POLYLINE': {
            if (!entity.vertices || entity.vertices.length === 0) return null;
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            entity.vertices.forEach(v => {
                minX = Math.min(minX, v.x);
                maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y);
                maxY = Math.max(maxY, v.y);
            });
            return { minX, maxX, minY, maxY };
        }
        case 'LINE': {
            if (!entity.start || !entity.end) return null;
            return {
                minX: Math.min(entity.start.x, entity.end.x),
                maxX: Math.max(entity.start.x, entity.end.x),
                minY: Math.min(entity.start.y, entity.end.y),
                maxY: Math.max(entity.start.y, entity.end.y)
            };
        }
        case 'CIRCLE':
        case 'ARC': {
            if (!entity.center) return null;
            const r = entity.radius || 0;
            return {
                minX: entity.center.x - r,
                maxX: entity.center.x + r,
                minY: entity.center.y - r,
                maxY: entity.center.y + r
            };
        }
        default:
            return null;
    }
}

function drawEntity(ctx, entity, toCanvasX, toCanvasY, scale, category, isDark, dimmed) {
    const savedAlpha = ctx.globalAlpha;

    switch (entity.type) {
        case 'LWPOLYLINE':
        case 'POLYLINE': {
            const vertices = entity.vertices || [];
            if (vertices.length < 2) return;

            ctx.beginPath();
            ctx.moveTo(toCanvasX(vertices[0].x), toCanvasY(vertices[0].y));
            for (let i = 1; i < vertices.length; i++) {
                ctx.lineTo(toCanvasX(vertices[i].x), toCanvasY(vertices[i].y));
            }

            // Close if shape flag or enough vertices
            const isClosed = entity.shape || (vertices.length >= 4 && vertices.length <= 5);
            if (isClosed) {
                ctx.closePath();
                // Fill for classified elements
                if (category !== 'other' && !dimmed) {
                    ctx.globalAlpha = dimmed ? 0.05 : 0.15;
                    ctx.fillStyle = getCategoryColor(category, isDark);
                    ctx.fill();
                    ctx.globalAlpha = savedAlpha;
                }
            }
            ctx.stroke();
            break;
        }
        case 'LINE': {
            if (!entity.start || !entity.end) return;
            ctx.beginPath();
            ctx.moveTo(toCanvasX(entity.start.x), toCanvasY(entity.start.y));
            ctx.lineTo(toCanvasX(entity.end.x), toCanvasY(entity.end.y));
            ctx.stroke();
            break;
        }
        case 'CIRCLE': {
            if (!entity.center) return;
            const cx = toCanvasX(entity.center.x);
            const cy = toCanvasY(entity.center.y);
            const r = (entity.radius || 0) * scale;
            ctx.beginPath();
            ctx.arc(cx, cy, Math.abs(r), 0, Math.PI * 2);
            if (category !== 'other' && !dimmed) {
                ctx.globalAlpha = 0.15;
                ctx.fillStyle = getCategoryColor(category, isDark);
                ctx.fill();
                ctx.globalAlpha = savedAlpha;
            }
            ctx.stroke();
            break;
        }
        case 'ARC': {
            if (!entity.center) return;
            const acx = toCanvasX(entity.center.x);
            const acy = toCanvasY(entity.center.y);
            const ar = (entity.radius || 0) * scale;
            const startAngle = ((entity.startAngle || 0) * Math.PI) / 180;
            const endAngle = ((entity.endAngle || 360) * Math.PI) / 180;
            ctx.beginPath();
            ctx.arc(acx, acy, Math.abs(ar), -endAngle, -startAngle);
            ctx.stroke();
            break;
        }
    }
}

// ============================================
// THREE.JS 3D RENDERER (Feature Integration)
// ============================================

function initThree() {
    if (threeState.isInitialized) return;

    const container = document.getElementById('threeContainer');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    threeState.scene = new THREE.Scene();
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    threeState.scene.background = new THREE.Color(isDark ? 0x0c1222 : 0xf1f5f9);

    // Camera
    threeState.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000000);
    threeState.camera.position.set(2000, 2000, 2000);

    // Renderer
    threeState.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    threeState.renderer.setSize(width, height);
    threeState.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(threeState.renderer.domElement);

    // Controls
    threeState.controls = new THREE.OrbitControls(threeState.camera, threeState.renderer.domElement);
    threeState.controls.enableDamping = true;
    threeState.controls.dampingFactor = 0.05;

    // Raycasting
    threeState.raycaster = new THREE.Raycaster();
    threeState.mouse = new THREE.Vector2();

    // Event listener for tooltip
    container.addEventListener('mousemove', onThreeMouseMove);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    threeState.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1000, 2000, 1000);
    threeState.scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-1000, -2000, -1000);
    threeState.scene.add(dirLight2);

    // Axes Helper
    const axesHelper = new THREE.AxesHelper(500);
    threeState.scene.add(axesHelper);

    // Large Grid (Infinite-like)
    const gridSize = 100000;
    const gridDivisions = 500;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, isDark ? 0x334155 : 0x94a3b8, isDark ? 0x1e293b : 0xe2e8f0);
    gridHelper.position.y = -0.1; // Slightly below zero to avoid z-fighting
    threeState.scene.add(gridHelper);

    // Ground Plane for solid surface feeling
    const planeGeom = new THREE.PlaneGeometry(gridSize, gridSize);
    const planeMat = new THREE.MeshPhongMaterial({
        color: isDark ? 0x0c1222 : 0xf1f5f9,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    const plane = new THREE.Mesh(planeGeom, planeMat);
    plane.rotation.x = Math.PI / 2;
    plane.position.y = -0.2;
    threeState.scene.add(plane);

    threeState.isInitialized = true;

    // Animation Loop
    function animate() {
        if (!threeState.isInitialized) return;
        requestAnimationFrame(animate);
        threeState.controls.update();
        threeState.renderer.render(threeState.scene, threeState.camera);
    }
    animate();
}

function switchViewMode(mode) {
    previewState.viewMode = mode;

    const btn2d = document.getElementById('view2dBtn');
    const btn3d = document.getElementById('view3dBtn');
    const wrapper2d = document.getElementById('canvasWrapper2d');
    const wrapper3d = document.getElementById('canvasWrapper3d');

    if (mode === '3D') {
        btn3d.classList.add('active');
        btn2d.classList.remove('active');
        wrapper2d.classList.add('hidden');
        wrapper3d.classList.remove('hidden');

        // Initialize and generate scene
        initThree();
        update3DScene();

        // Ensure renderer fills container after being unhidden
        setTimeout(() => {
            const container = document.getElementById('threeContainer');
            threeState.renderer.setSize(container.clientWidth, container.clientHeight);
            threeState.camera.aspect = container.clientWidth / container.clientHeight;
            threeState.camera.updateProjectionMatrix();
        }, 50);
    } else {
        btn2d.classList.add('active');
        btn3d.classList.remove('active');
        wrapper3d.classList.add('hidden');
        wrapper2d.classList.remove('hidden');
        renderDxfPreview();
    }
}

function update3DScene() {
    if (!threeState.isInitialized) return;

    // Clear existing objects
    threeState.objects.forEach(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
        }
        threeState.scene.remove(obj);
    });
    threeState.objects = [];

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    // Combine all data for centering
    let allEntities = [];
    floors.forEach(f => allEntities.push(...f.dxfData.entities));
    if (dxfData) allEntities.push(...dxfData.entities);

    if (allEntities.length === 0) return;

    // Calculate global bounding box for centering
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    allEntities.forEach(entity => {
        const bounds = getEntityBounds(entity);
        if (bounds) {
            minX = Math.min(minX, bounds.minX);
            maxX = Math.max(maxX, bounds.maxX);
            minY = Math.min(minY, bounds.minY);
            maxY = Math.max(maxY, bounds.maxY);
        }
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Render saved floors
    floors.forEach(floor => {
        renderEntitiesIn3D(floor.dxfData, floor.entityGroupMap, floor.layerCategoryMap, floor.height, floor.zOffset, centerX, centerY, isDark);
    });

    // Render current unsaved floor
    if (dxfData) {
        const currentHeight = parseFloat(document.getElementById('floorHeightInput').value) || 3.0;
        let currentZ = floors.reduce((sum, f) => sum + f.height, 0);
        renderEntitiesIn3D(dxfData, entityGroupMap, layerCategoryMap, currentHeight, currentZ, centerX, centerY, isDark);
    }
    updateThreeHighlight();
}

function renderEntitiesIn3D(data, groupMap, catMap, heightM, zOffsetM, centerX, centerY, isDark) {
    const heightDxf = (heightM * 100) / DXF_TO_CM;
    const zOffsetDxf = (zOffsetM * 100) / DXF_TO_CM;
    const topLevelY = zOffsetDxf + heightDxf;

    if (!data || !data.entities) return;

    data.entities.forEach((entity, idx) => {
        const category = getEntityCategory(entity, catMap);
        if (category === 'other') return;

        const groupInfo = groupMap.get(idx);
        const colorStr = getCategoryColor(category, isDark);
        const color = new THREE.Color(colorStr);

        let mesh = null;

        if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
            const vertices = entity.vertices || [];
            if (vertices.length < 2) return;

            const shape = new THREE.Shape();
            shape.moveTo(vertices[0].x - centerX, vertices[0].y - centerY);
            for (let i = 1; i < vertices.length; i++) {
                shape.lineTo(vertices[i].x - centerX, vertices[i].y - centerY);
            }

            const first = vertices[0];
            const last = vertices[vertices.length - 1];
            const distSq = Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2);
            const isClosed = entity.shape || (distSq <= 1.0) || (vertices.length >= 4 && vertices.length <= 5);

            if (isClosed) shape.closePath();

            // Slabs/Beams start from top and go down
            let thicknessCm = 20; // Default
            if (groupInfo && groupInfo.thickness) {
                thicknessCm = groupInfo.thickness;
            } else if (category === 'slab') {
                thicknessCm = 20;
            }

            const extrusionDepth = (category === 'slab' || category === 'beam') ? (thicknessCm / DXF_TO_CM) : heightDxf;

            const extrudeSettings = {
                depth: extrusionDepth,
                bevelEnabled: false
            };

            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const material = new THREE.MeshPhongMaterial({
                color: color,
                transparent: true,
                opacity: category === 'slab' ? 0.7 : 0.85,
                side: THREE.DoubleSide
            });
            mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;

            // If slab/beam, position it at the top of the floor
            if (category === 'slab' || category === 'beam') {
                mesh.position.y = topLevelY; // Starts at top, extrudes down (because mesh.rotation.x = -PI/2 makes depth go down?)
                // Actually Three.js depth goes along Z. After rotation -PI/2, mesh space Z is world room -Y.
                // So position.y = topLevelY makes it go from topLevelY to topLevelY - extrusionDepth. Correct.
            } else {
                mesh.position.y = zOffsetDxf;
            }
        }
        else if (entity.type === 'CIRCLE') {
            const geometry = new THREE.CylinderGeometry(
                entity.radius,
                entity.radius,
                heightDxf,
                32
            );
            const material = new THREE.MeshPhongMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(entity.center.x - centerX, zOffsetDxf + heightDxf / 2, -(entity.center.y - centerY));
        }

        if (mesh) {
            mesh.userData = { typeName: groupInfo?.typeName, category: category };
            threeState.scene.add(mesh);
            threeState.objects.push(mesh);
        }
    });
}

function onThreeMouseMove(event) {
    if (!threeState.isInitialized || previewState.viewMode !== '3D') return;

    const container = document.getElementById('threeContainer');
    const rect = container.getBoundingClientRect();

    // Calculate normalized mouse coordinates
    threeState.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    threeState.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycasting
    threeState.raycaster.setFromCamera(threeState.mouse, threeState.camera);
    const intersects = threeState.raycaster.intersectObjects(threeState.objects);

    const tooltip = document.getElementById('threeTooltip');
    if (intersects.length > 0) {
        const obj = intersects[0].object;
        const data = obj.userData;

        let areaVal = 0;
        // Find area from analysisResults (simplified lookup)
        const element = [...analysisResults.columns, ...analysisResults.walls, ...analysisResults.cores]
            .find(e => e.type === data.typeName);

        tooltip.innerHTML = `
            <strong>${data.typeName}</strong><br/>
            ${t('dimSize')}: ${element?.displaySize || '-'}<br/>
            ${t('dimArea')}: ${element?.totalArea || '-'} m²
        `;

        tooltip.style.left = (event.clientX - rect.left + 15) + 'px';
        tooltip.style.top = (event.clientY - rect.top + 15) + 'px';
        tooltip.classList.remove('hidden');

        // Hover highlight
        obj.material.emissive.setHex(0x333333);
    } else {
        tooltip.classList.add('hidden');
        if (!previewState.highlightedType) {
            threeState.objects.forEach(o => o.material.emissive.setHex(0x000000));
        } else {
            updateThreeHighlight();
        }
    }
}

function updateThreeHighlight() {
    if (!threeState.isInitialized) return;
    const highlighted = previewState.highlightedType;

    threeState.objects.forEach(obj => {
        if (!highlighted) {
            obj.material.opacity = 0.8;
            obj.material.emissive.setHex(0x000000);
        } else if (obj.userData.typeName === highlighted) {
            obj.material.opacity = 1.0;
            obj.material.emissive.setHex(0x333333);
        } else {
            obj.material.opacity = 0.1;
            obj.material.emissive.setHex(0x000000);
        }
    });
}

// ============================================
// DIMENSION LABELS ON PREVIEW (Feature 24)
// ============================================

function drawAllDimensionLabels(ctx, toCanvasX, toCanvasY, scale, isDark) {
    if (!dxfData || !dxfData.entities) return;

    const highlighted = previewState.highlightedType;
    const fontSize = Math.max(9, Math.min(12, 10 * previewState.zoom));
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Collect label positions to avoid overlaps
    const drawnLabels = [];

    dxfData.entities.forEach((entity, idx) => {
        const groupInfo = entityGroupMap.get(idx);
        if (!groupInfo) return;

        // If highlighting, only show labels for highlighted type
        if (highlighted && groupInfo.typeName !== highlighted) return;

        const bounds = getEntityBounds(entity);
        if (!bounds) return;

        // Calculate center in canvas coords
        const cx = toCanvasX((bounds.minX + bounds.maxX) / 2);
        const cy = toCanvasY((bounds.minY + bounds.maxY) / 2);

        // Check for overlap with already-drawn labels
        const labelText = groupInfo.typeName;
        const textWidth = ctx.measureText(labelText).width + 10;
        const labelHeight = fontSize + 6;
        const overlaps = drawnLabels.some(lbl => {
            return Math.abs(lbl.x - cx) < (textWidth + lbl.w) / 2 &&
                Math.abs(lbl.y - cy) < (labelHeight + lbl.h) / 2;
        });
        if (overlaps) return;

        // Draw label background
        const bgColor = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
        const borderColor = getCategoryColor(groupInfo.category, isDark);
        const textColor = isDark ? '#e2e8f0' : '#1e293b';

        const px = cx - textWidth / 2;
        const py = cy - labelHeight;

        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.roundRect(px, py, textWidth, labelHeight, 3);
        ctx.fill();
        ctx.stroke();

        // Draw label text
        ctx.fillStyle = textColor;
        ctx.fillText(labelText, cx, cy - 3);

        // Track drawn label position
        drawnLabels.push({ x: cx, y: cy, w: textWidth, h: labelHeight });
    });
}

function drawHighlightBadge(ctx, w, isDark, typeName) {
    const text = `🔍 ${typeName}`;
    const fontSize = 13;
    ctx.font = `700 ${fontSize}px Inter, sans-serif`;
    const textWidth = ctx.measureText(text).width + 20;
    const badgeH = 28;
    const bx = 12;
    const by = 12;

    ctx.fillStyle = isDark ? 'rgba(37, 99, 235, 0.9)' : 'rgba(37, 99, 235, 0.85)';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.roundRect(bx, by, textWidth, badgeH, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + 10, by + badgeH / 2);
}

// ============================================
// RESULTS DISPLAY
// ============================================

function displayResults() {
    // 1. Aggregation logic
    let allColumns = [];
    let allWalls = [];
    let allCores = [];
    let allBeams = [];
    let allSlabs = [];

    // Combine previous floors and current unsaved result
    const sourceData = floors.length > 0 ? floors.map(f => f.results) : [];
    if (analysisResults) sourceData.push(analysisResults);

    sourceData.forEach(res => {
        if (!res) return;
        allColumns.push(...(res.columns || []));
        allWalls.push(...(res.walls || []));
        allCores.push(...(res.cores || []));
        allBeams.push(...(res.beams || []));
        allSlabs.push(...(res.slabs || []));
    });

    const groupByType = (arr) => {
        const map = new Map();
        arr.forEach(item => {
            if (!item) return;

            // Create a unique key based on element properties rather than generic names like "Döşeme-1"
            let key;
            if (item.type.startsWith('Döşeme')) {
                key = `SLAB_${item.thickness || 20}_${item.area}`;
            } else if (item.type.startsWith('Kiriş')) {
                key = `BEAM_${item.displaySize}_${item.totalLength}`;
            } else if (item.type.startsWith('K')) {
                // Columns
                key = `COL_${item.displaySize}`;
            } else {
                // Walls, Cores etc.
                key = `OTHER_${item.type}`;
            }

            const existing = map.get(key);
            if (existing) {
                existing.count += (item.count || 0);
                // For walls/cores, we still sum the length etc if we had property keys for them
                // But for slabs, we keep the area if we grouped by area.
            } else {
                map.set(key, { ...JSON.parse(JSON.stringify(item)) });
            }
        });

        // Re-calculate the generic display names (Döşeme-1, K-1 etc.) for the final list
        const finalArr = Array.from(map.values());

        // Sort groups by properties
        finalArr.sort((a, b) => {
            // Slabs: Sort by thickness then area
            if (a.thickness && b.thickness && a.thickness !== b.thickness) return b.thickness - a.thickness;
            if (a.area && b.area) return b.area - a.area;
            // Columns: Sort by size
            if (a.displaySize && b.displaySize) return a.displaySize.localeCompare(b.displaySize);
            return a.type.localeCompare(b.type);
        });

        // Re-assign sequential names for clarity in the UI
        const typeCounters = {};
        return finalArr.map(item => {
            let prefix = item.type.split('-')[0].replace(/[0-9]/g, '');
            if (!typeCounters[prefix]) typeCounters[prefix] = 0;
            typeCounters[prefix]++;

            // Adjust item name e.g. "Döşeme-1", "K-1"
            if (prefix === 'K') item.type = `K${typeCounters[prefix]}`;
            else item.type = `${prefix}-${typeCounters[prefix]}`;

            return item;
        });
    };

    const columns = groupByType(allColumns);
    const walls = groupByType(allWalls);
    const cores = groupByType(allCores);
    const beams = groupByType(allBeams);
    const slabs = groupByType(allSlabs);

    // 2. Summary Card update
    const columnCount = columns.reduce((sum, col) => sum + col.count, 0);
    const wallCount = walls.reduce((sum, w) => sum + w.count, 0);
    const coreCount = cores.reduce((sum, c) => sum + c.count, 0);
    const beamCount = beams.reduce((sum, b) => sum + b.count, 0);
    const slabCount = slabs.reduce((sum, s) => sum + s.count, 0);

    document.getElementById('columnCount').textContent = columnCount;
    document.getElementById('wallCount').textContent = wallCount;
    document.getElementById('coreCount').textContent = coreCount;
    document.getElementById('beamCount').textContent = beamCount;
    document.getElementById('slabCount').textContent = slabCount;
    document.getElementById('totalElements').textContent = columnCount + wallCount + coreCount + beamCount + slabCount;

    const resultsTitle = document.querySelector('.results-header h2 span');
    if (resultsTitle) {
        resultsTitle.textContent = floors.length > 0 ? t('totalBuildingMetraj') || 'Bina Genel Metrajı' : t('analysisResults');
    }

    // 3. Populate Tables
    // Columns
    const columnsTableBody = document.getElementById('columnsTableBody');
    const columnsTableWrapper = document.getElementById('columnsTableWrapper');
    columnsTableBody.innerHTML = '';
    if (columns.length === 0) {
        columnsTableWrapper.classList.add('hidden');
    } else {
        columnsTableWrapper.classList.remove('hidden');
        columns.forEach((col, index) => {
            const row = document.createElement('tr');
            row.classList.add('clickable-row');
            row.dataset.typeName = col.type;
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${col.type}</strong></td>
                <td>${col.displaySize}</td>
                <td><span style="color: var(--primary-blue-light); font-weight: 600;">${col.count}</span></td>
            `;
            row.addEventListener('click', () => toggleHighlight(col.type, row));
            columnsTableBody.appendChild(row);
        });
    }

    // Walls
    const wallsTableBody = document.getElementById('wallsTableBody');
    const wallsTableWrapper = document.getElementById('wallsTableWrapper');
    wallsTableBody.innerHTML = '';
    if (walls.length === 0) {
        wallsTableWrapper.classList.add('hidden');
    } else {
        wallsTableWrapper.classList.remove('hidden');
        walls.forEach((wall, index) => {
            const row = document.createElement('tr');
            row.classList.add('clickable-row');
            row.dataset.typeName = wall.type;
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${wall.type}</strong></td>
                <td>${wall.totalLength} m</td>
                <td><span style="color: var(--purple-light); font-weight: 600;">${wall.count}</span></td>
            `;
            row.addEventListener('click', () => toggleHighlight(wall.type, row));
            wallsTableBody.appendChild(row);
        });
    }

    // Cores
    const coresTableBody = document.getElementById('coresTableBody');
    const coresTableWrapper = document.getElementById('coresTableWrapper');
    coresTableBody.innerHTML = '';
    if (cores.length === 0) {
        coresTableWrapper.classList.add('hidden');
    } else {
        coresTableWrapper.classList.remove('hidden');
        cores.forEach((core, index) => {
            const row = document.createElement('tr');
            row.dataset.typeName = core.type;
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${core.type}</strong></td>
                <td>${core.totalLength} m</td>
                <td><span style="color: #5eead4; font-weight: 600;">${core.count}</span></td>
            `;
            row.addEventListener('click', () => toggleHighlight(core.type, row));
            coresTableBody.appendChild(row);
        });
    }

    // Beams
    const beamsTableBody = document.getElementById('beamsTableBody');
    const beamsTableWrapper = document.getElementById('beamsTableWrapper');
    beamsTableBody.innerHTML = '';
    if (beams.length === 0) {
        beamsTableWrapper.classList.add('hidden');
    } else {
        beamsTableWrapper.classList.remove('hidden');
        beams.forEach((beam, index) => {
            const row = document.createElement('tr');
            row.dataset.typeName = beam.type;
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${beam.type}</strong></td>
                <td>${beam.displaySize}</td>
                <td>${beam.totalLength} m</td>
                <td><span style="color: #fbbf24; font-weight: 600;">${beam.count}</span></td>
            `;
            row.addEventListener('click', () => toggleHighlight(beam.type, row));
            beamsTableBody.appendChild(row);
        });
    }

    // Slabs
    const slabsTableBody = document.getElementById('slabsTableBody');
    const slabsTableWrapper = document.getElementById('slabsTableWrapper');
    slabsTableBody.innerHTML = '';
    if (slabs.length === 0) {
        slabsTableWrapper.classList.add('hidden');
    } else {
        slabsTableWrapper.classList.remove('hidden');
        slabs.forEach((slab, index) => {
            const row = document.createElement('tr');
            row.dataset.typeName = slab.type;
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${slab.type}</strong></td>
                <td>${slab.displaySize}</td>
                <td>${slab.area} m²</td>
                <td><span style="color: #ec4899; font-weight: 600;">${slab.count}</span></td>
            `;
            row.addEventListener('click', () => toggleHighlight(slab.type, row));
            slabsTableBody.appendChild(row);
        });
    }

    // 4. Update UI Components
    updateFloorTable();

    // Smooth scroll to results if we just analyzed the first floor
    if (analysisResults && floors.length === 0) {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function saveAndAddAnotherFloor() {
    if (!analysisResults || !dxfData) {
        showToast('Analiz sonuçları hazır değil!', 'error');
        return;
    }

    const floorHeightM = parseFloat(document.getElementById('floorHeightInput').value) || 3.0;

    // Save current floor
    const floorId = Date.now();
    const floorName = uploadedFile ? uploadedFile.name.replace('.dxf', '').replace('.dwg', '') : `Kat ${floors.length + 1}`;

    // Calculate zOffset based on previous floors
    let zOffset = 0;
    if (floors.length > 0) {
        zOffset = floors.reduce((sum, f) => sum + f.height, 0);
    }

    const currentFloor = {
        id: floorId,
        name: floorName,
        dxfData: JSON.parse(JSON.stringify(dxfData)), // Deep copy
        results: JSON.parse(JSON.stringify(analysisResults)),
        height: floorHeightM,
        zOffset: zOffset,
        layerCategoryMap: layerCategoryMap ? JSON.parse(JSON.stringify(layerCategoryMap)) : null,
        entityGroupMap: new Map(entityGroupMap)
    };

    floors.push(currentFloor);
    isMultiFloorMode = true;

    // Reset for next floor but keep it in "Multi-floor" mode
    uploadedFile = null;
    analysisResults = null;
    dxfData = null;
    layerCategoryMap = null;
    entityGroupMap = new Map();

    // UI Updates
    document.getElementById('fileInput').value = '';
    resultsSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    floorManagementSection.classList.remove('hidden');

    updateFloorTable();
    displayResults(); // Ensure UI reflects building-wide totals
    showToast(`${floorName} kaydedildi. Yeni kat yükleyebilirsiniz.`, 'success');
}

function updateFloorTable() {
    floorTableBody.innerHTML = '';

    if (floors.length === 0) {
        floorManagementSection.classList.add('hidden');
        return;
    }

    floorManagementSection.classList.remove('hidden');

    floors.forEach((floor, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${floor.name}</strong></td>
            <td>
                <input type="number" value="${floor.height}" step="0.1" 
                    onchange="updateFloorHeight(${floor.id}, this.value)"
                    style="width: 60px; padding: 4px; background: var(--dark-bg); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="deleteFloor(${floor.id})" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        floorTableBody.appendChild(row);
    });
}

function updateFloorHeight(id, newHeight) {
    const floor = floors.find(f => f.id === id);
    if (floor) {
        floor.height = parseFloat(newHeight) || 3.0;

        // Recalculate zOffsets
        let currentZ = 0;
        floors.forEach(f => {
            f.zOffset = currentZ;
            currentZ += f.height;
        });

        if (previewState.viewMode === '3D') {
            update3DScene();
        }
    }
}

function deleteFloor(id) {
    floors = floors.filter(f => f.id !== id);
    updateFloorTable();
    updateGlobalAverages();
    if (previewState.viewMode === '3D') {
        update3DScene();
    }
}

function updateGlobalAverages() {
    displayResults();
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function exportToExcel() {
    if (!analysisResults && floors.length === 0) return;

    showToast(t('excelPreparing'), 'success');

    const workbook = XLSX.utils.book_new();

    // 1. Prepare Aggregated Data
    let allColumns = [];
    let allWalls = [];
    let allCores = [];
    let allBeams = [];
    let allSlabs = [];

    const sourceData = floors.length > 0 ? floors.map(f => f.results) : [analysisResults];
    if (floors.length > 0 && analysisResults) sourceData.push(analysisResults);

    sourceData.forEach(res => {
        if (!res) return;
        allColumns.push(...(res.columns || []));
        allWalls.push(...(res.walls || []));
        allCores.push(...(res.cores || []));
        allBeams.push(...(res.beams || []));
        allSlabs.push(...(res.slabs || []));
    });

    const groupByType = (arr) => {
        const map = new Map();
        arr.forEach(item => {
            const existing = map.get(item.type);
            if (existing) {
                existing.count += item.count;
            } else {
                map.set(item.type, { ...item });
            }
        });
        return Array.from(map.values());
    };

    const finalColumns = groupByType(allColumns);
    const finalWalls = groupByType(allWalls);
    const finalCores = groupByType(allCores);
    const finalBeams = groupByType(allBeams);
    const finalSlabs = groupByType(allSlabs);

    // 2. Summary Sheet
    const summaryData = [
        ["AutoQuant - PROJE ÖZET RAPORU"],
        ["Tarih:", new Date().toLocaleString()],
        ["Yüklenen Kat Sayısı:", floors.length + (analysisResults ? 1 : 0)],
        [],
        ["Kategori", "Eleman Sayısı", "Metraj Birimi"],
        [t('column'), finalColumns.reduce((s, c) => s + c.count, 0), "adet"],
        [t('wall'), finalWalls.reduce((s, c) => s + c.count, 0), "m"],
        [t('core'), finalCores.reduce((s, c) => s + c.count, 0), "m"],
        [t('beam'), finalBeams.reduce((s, c) => s + c.count, 0), "m"],
        [t('slab'), finalSlabs.reduce((s, c) => s + c.count, 0), "m²"]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "ÖZET");

    // 3. Category Sheets
    if (finalColumns.length > 0) {
        const data = [[t('typeName'), t('sectionSize'), t('count')], ...finalColumns.map(c => [c.type, c.displaySize, c.count])];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(data), currentLang === 'tr' ? "Kolonlar" : "Columns");
    }
    if (finalWalls.length > 0) {
        const data = [[t('typeName'), t('totalLength'), t('count')], ...finalWalls.map(c => [c.type, c.totalLength, c.count])];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(data), currentLang === 'tr' ? "Perdeler" : "Walls");
    }
    if (finalCores.length > 0) {
        const data = [[t('typeName'), t('totalLength'), t('count')], ...finalCores.map(c => [c.type, c.totalLength, c.count])];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(data), currentLang === 'tr' ? "Çekirdekler" : "Cores");
    }
    if (finalBeams.length > 0) {
        const data = [[t('typeName'), t('totalLength'), t('count')], ...finalBeams.map(c => [c.type, c.totalLength, c.count])];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(data), currentLang === 'tr' ? "Kirişler" : "Beams");
    }
    if (finalSlabs.length > 0) {
        const data = [[t('typeName'), t('totalArea'), t('count')], ...finalSlabs.map(c => [c.type, c.area, c.count])];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(data), currentLang === 'tr' ? "Döşemeler" : "Slabs");
    }

    // 4. Floor Wise Details
    if (floors.length > 0) {
        const floorData = [[t('floorName'), t('column'), t('wall'), t('core'), t('beam'), t('slab')]];
        floors.forEach(f => {
            floorData.push([
                f.name,
                f.results.columns.reduce((s, c) => s + c.count, 0),
                f.results.walls.reduce((s, c) => s + c.count, 0),
                f.results.cores.reduce((s, c) => s + c.count, 0),
                (f.results.beams || []).reduce((s, c) => s + c.count, 0),
                (f.results.slabs || []).reduce((s, c) => s + c.count, 0)
            ]);
        });
        // Add current unsaved floor to breakdown if exists
        if (analysisResults) {
            floorData.push([
                uploadedFile ? uploadedFile.name : "Aktif Analiz",
                analysisResults.columns.reduce((s, c) => s + c.count, 0),
                analysisResults.walls.reduce((s, c) => s + c.count, 0),
                analysisResults.cores.reduce((s, c) => s + c.count, 0),
                (analysisResults.beams || []).reduce((s, c) => s + c.count, 0),
                (analysisResults.slabs || []).reduce((s, c) => s + c.count, 0)
            ]);
        }
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(floorData), currentLang === 'tr' ? "Kat Bazlı Özet" : "Floor Summary");
    }

    XLSX.writeFile(workbook, `AutoQuant_raporu_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast(t('excelDownloaded'), 'success');
}

function exportTo3DDXF() {
    if (!analysisResults && floors.length === 0) {
        showToast('Analiz sonuçları hazır değil!', 'error');
        return;
    }

    showToast(t('progressPreparing'), 'success');

    let dxf = "0\r\nSECTION\r\n2\r\nENTITIES\r\n";

    // Function to append entities to DXF string
    const appendEntities = (data, groupMap, catMap, heightM, zOffsetM, floorPrefix) => {
        const heightDxfValue = (heightM * 100) / DXF_TO_CM;
        const zOffsetDxf = ((zOffsetM * 100) / DXF_TO_CM).toFixed(4);

        data.entities.forEach((entity, idx) => {
            const category = getEntityCategory(entity, catMap);
            if (category === 'other') return;

            const groupInfo = groupMap.get(idx);
            const layerName = `${floorPrefix}_3D_${category.toUpperCase()}_${groupInfo?.typeName || 'UNKNOWN'}`;

            // Slabs are usually thinner (20cm)
            const finalHeightDxf = category === 'slab' ? (20 / DXF_TO_CM).toFixed(4) : heightDxfValue.toFixed(4);

            if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
                const vertices = entity.vertices || [];
                if (vertices.length < 2) return;

                dxf += "0\r\nPOLYLINE\r\n";
                dxf += "8\r\n" + layerName + "\r\n";
                dxf += "66\r\n1\r\n";
                dxf += "39\r\n" + finalHeightDxf + "\r\n";
                dxf += "70\r\n" + (entity.shape ? "1" : "0") + "\r\n";

                vertices.forEach(v => {
                    dxf += "0\r\nVERTEX\r\n";
                    dxf += "8\r\n" + layerName + "\r\n";
                    dxf += "10\r\n" + v.x.toFixed(4) + "\r\n";
                    dxf += "20\r\n" + v.y.toFixed(4) + "\r\n";
                    dxf += "30\r\n" + zOffsetDxf + "\r\n";
                });
                dxf += "0\r\nSEQEND\r\n";
                dxf += "8\r\n" + layerName + "\r\n";
            }
            else if (entity.type === 'CIRCLE') {
                dxf += "0\r\nCIRCLE\r\n";
                dxf += "8\r\n" + layerName + "\r\n";
                dxf += "39\r\n" + heightDxf + "\r\n";
                dxf += "10\r\n" + entity.center.x.toFixed(4) + "\r\n";
                dxf += "20\r\n" + entity.center.y.toFixed(4) + "\r\n";
                dxf += "30\r\n" + zOffsetDxf + "\r\n";
                dxf += "40\r\n" + entity.radius.toFixed(4) + "\r\n";
            }
        });
    };

    // Export saved floors
    floors.forEach((floor, i) => {
        appendEntities(floor.dxfData, floor.entityGroupMap, floor.layerCategoryMap, floor.height, floor.zOffset, `F${i + 1}_${floor.name.replace(/\s+/g, '_')}`);
    });

    // Export current floor
    if (dxfData) {
        const h = parseFloat(document.getElementById('floorHeightInput').value) || 3.0;
        const z = floors.reduce((sum, f) => sum + f.height, 0);
        appendEntities(dxfData, entityGroupMap, layerCategoryMap, h, z, "CURRENT");
    }

    dxf += "0\r\nENDSEC\r\n0\r\nEOF\r\n";

    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `3d_building_model_${new Date().toISOString().split('T')[0]}.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('3D Bina Modeli indirildi!', 'success');
}

function resetAnalysis() {
    uploadedFile = null;
    analysisResults = null;
    dxfData = null;
    layerCategoryMap = null;
    entityGroupMap = new Map();
    floors = [];
    isMultiFloorMode = false;

    fileInput.value = '';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';

    // Reset preview state
    previewState.zoom = 1;
    previewState.panX = 0;
    previewState.panY = 0;
    previewState.highlightedType = null;
    previewState.showLabels = true;

    resultsSection.classList.add('hidden');
    loadingSection.classList.add('hidden');
    document.getElementById('layerSelectionSection').classList.add('hidden');
    uploadSection.classList.remove('hidden');
    setViewportMode(true);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(t('newAnalysisReady'), 'success');
}

// ============================================
// HIGHLIGHT & LABEL TOGGLE (Feature 27 & 24)
// ============================================

function toggleHighlight(typeName, clickedRow) {
    // Toggle: if same type clicked again, deselect
    if (previewState.highlightedType === typeName) {
        previewState.highlightedType = null;
    } else {
        previewState.highlightedType = typeName;
    }

    // Update all row styles
    document.querySelectorAll('.clickable-row').forEach(row => {
        if (previewState.highlightedType && row.dataset.typeName === previewState.highlightedType) {
            row.classList.add('row-highlighted');
        } else {
            row.classList.remove('row-highlighted');
        }
    });

    // Show/hide clear highlight button
    const clearBtn = document.getElementById('clearHighlightBtn');
    if (previewState.highlightedType) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }

    // Re-render preview
    renderDxfPreview();

    // Scroll to preview
    if (previewState.highlightedType) {
        document.getElementById('previewCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
// WINDOW RESIZE HANDLER (for preview)
// ============================================
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (dxfData && layerCategoryMap && !resultsSection.classList.contains('hidden')) {
            renderDxfPreview();
        }
    }, 200);
});

// ============================================
// INITIALIZATION
// ============================================

// ============================================
// LOGIC FOR THICKNESS EXTRACTION (Feature Request)
// ============================================

function extractThicknessFromTexts(dxf, layers) {
    if (!layers || layers.length === 0) return [];
    const thicknesses = [];

    dxf.entities.forEach(entity => {
        if ((entity.type === 'TEXT' || entity.type === 'MTEXT') && layers.includes(entity.layer)) {
            const rawText = (entity.text || entity.value || "");
            // Clean up text (handle escaped characters in MTEXT like \P, \f, etc.)
            const text = rawText.replace(/\\P|\\f.*?;|\\p.*?;|\\H.*?;|\\Q.*?;|\\T.*?;|\\W.*?;|\\A.*?;|\\C.*?;|\\L|\\l|\\O|\\o|\\K|\\k|\\X|{|}/g, "").toLowerCase();

            // Regex for s=250mm, s=400, 250mm, etc.
            const match = text.match(/s\s*=\s*(\d+)/i) || text.match(/(\d+)\s*(mm|cm)/i) || text.match(/^(\d+)$/);

            if (match) {
                let val = parseInt(match[1]);
                let unit = match[2] || 'mm';
                if (unit === 'mm') val /= 10; // mm to cm

                thicknesses.push({
                    x: entity.position ? entity.position.x : (entity.center ? entity.center.x : 0),
                    y: entity.position ? entity.position.y : (entity.center ? entity.center.y : 0),
                    thickness: val
                });
            }
        }
    });
    return thicknesses;
}

function isPointInPolyline(point, vertices) {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        let xi = vertices[i].x, yi = vertices[i].y;
        let xj = vertices[j].x, yj = vertices[j].y;
        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('AutoQuant (Profesyonel DXF Parser) hazır!');
    console.log('Desteklenen layer adları:', LAYER_PATTERNS);

    // Initialize theme
    initTheme();

    // Apply saved language
    if (typeof applyLanguage === 'function') {
        applyLanguage();
    }
});
