// ============================================
// SIMPLE DXF PARSER - LOCAL IMPLEMENTATION
// ============================================
// Simplified DXF parser for basic entity extraction

class DxfParser {
    parseSync(dxfString) {
        const lines = dxfString.split('\n').map(line => line.trim());
        const entities = [];
        const tables = { layer: { layers: {} } };

        let currentSection = null;
        let currentEntity = null;
        let currentCode = null;
        let inEntities = false;
        let inTables = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Group code
            if (i % 2 === 0) {
                currentCode = parseInt(line);
                continue;
            }

            // Value
            const value = line;

            // Section detection
            if (currentCode === 0 && value === 'SECTION') {
                const nextValue = lines[i + 2];
                if (nextValue === 'ENTITIES') {
                    inEntities = true;
                    inTables = false;
                } else if (nextValue === 'TABLES') {
                    inTables = true;
                    inEntities = false;
                } else {
                    inEntities = false;
                    inTables = false;
                }
                continue;
            }

            // End section
            if (currentCode === 0 && value === 'ENDSEC') {
                inEntities = false;
                inTables = false;
                continue;
            }

            // Parse entities
            if (inEntities && currentCode === 0) {
                // Save previous entity
                if (currentEntity && currentEntity.type) {
                    entities.push(currentEntity);
                }

                // Start new entity
                if (value === 'LWPOLYLINE' || value === 'POLYLINE') {
                    currentEntity = {
                        type: 'LWPOLYLINE',
                        vertices: [],
                        layer: null
                    };
                } else if (value === 'CIRCLE') {
                    currentEntity = {
                        type: 'CIRCLE',
                        center: { x: 0, y: 0 },
                        radius: 0,
                        layer: null
                    };
                } else if (value === 'LINE') {
                    currentEntity = {
                        type: 'LINE',
                        start: { x: 0, y: 0 },
                        end: { x: 0, y: 0 },
                        vertices: [],
                        layer: null
                    };
                } else if (value === 'ARC') {
                    currentEntity = {
                        type: 'ARC',
                        center: { x: 0, y: 0 },
                        radius: 0,
                        layer: null
                    };
                } else {
                    currentEntity = { type: value };
                }
            }

            // Parse entity properties
            if (currentEntity) {
                // Layer
                if (currentCode === 8) {
                    currentEntity.layer = value;

                    // Add to layers table
                    if (!tables.layer.layers[value]) {
                        tables.layer.layers[value] = { name: value };
                    }
                }

                // Polyline vertices
                if (currentEntity.type === 'LWPOLYLINE' || currentEntity.type === 'POLYLINE') {
                    if (currentCode === 10) {
                        // X coordinate
                        currentEntity.vertices.push({ x: parseFloat(value), y: 0 });
                    } else if (currentCode === 20) {
                        // Y coordinate
                        const lastVertex = currentEntity.vertices[currentEntity.vertices.length - 1];
                        if (lastVertex) {
                            lastVertex.y = parseFloat(value);
                        }
                    } else if (currentCode === 70) {
                        // Closed flag
                        currentEntity.shape = parseInt(value) === 1;
                    }
                }

                // Circle properties
                if (currentEntity.type === 'CIRCLE') {
                    if (currentCode === 10) {
                        currentEntity.center.x = parseFloat(value);
                    } else if (currentCode === 20) {
                        currentEntity.center.y = parseFloat(value);
                    } else if (currentCode === 40) {
                        currentEntity.radius = parseFloat(value);
                    }
                }

                // Line properties
                if (currentEntity.type === 'LINE') {
                    if (currentCode === 10) {
                        currentEntity.start.x = parseFloat(value);
                    } else if (currentCode === 20) {
                        currentEntity.start.y = parseFloat(value);
                    } else if (currentCode === 11) {
                        currentEntity.end.x = parseFloat(value);
                    } else if (currentCode === 21) {
                        currentEntity.end.y = parseFloat(value);
                    }
                }

                // Arc properties
                if (currentEntity.type === 'ARC') {
                    if (currentCode === 10) {
                        currentEntity.center.x = parseFloat(value);
                    } else if (currentCode === 20) {
                        currentEntity.center.y = parseFloat(value);
                    } else if (currentCode === 40) {
                        currentEntity.radius = parseFloat(value);
                    }
                }
            }
        }

        // Save last entity
        if (currentEntity && currentEntity.type) {
            entities.push(currentEntity);
        }

        return {
            entities: entities,
            tables: tables
        };
    }
}

// Make it globally available
window.DxfParser = DxfParser;
