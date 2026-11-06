export function init2DBoard(boardId: string, geo: any, win: any) {
    const el = document.getElementById(boardId);
    if (!el) return;

    // Clean up existing board if any
    if (win.JXG && win.JXG.boards && win.JXG.boards[boardId]) {
        win.JXG.JSXGraph.freeBoard(win.JXG.boards[boardId]);
        delete win.JXG.boards[boardId];
    }

    try {
        const s = geo.settings || {};
        // Initialize Board with UI settings
        const board = win.JXG.JSXGraph.initBoard(boardId, {
            boundingbox: [
                parseFloat(s.xMin) || -5,
                parseFloat(s.yMax) || 5,
                parseFloat(s.xMax) || 5,
                parseFloat(s.yMin) || -5
            ],
            axis: !!s.axis,
            grid: !!s.grid,
            keepaspectratio: !!s.keepaspectratio,
            showCopyright: false,
            showNavigation: false
        });

        // 1. Render Visual Elements from UI with isolated try-catch
        if (geo.elements) {
            geo.elements.forEach((el: any) => {
                try {
                    const style = {
                        strokeColor: '#000000',
                        fillColor: 'transparent',
                        highlight: false,
                        strokeWidth: 1.5,
                        label: { visible: true, autoPosition: true, fontSize: 14 }
                    };

                    switch (el.type) {
                        case 'point':
                            if (el.name) {
                                board.create('point', [parseFloat(el.x) || 0, parseFloat(el.y) || 0], {
                                    ...style,
                                    name: el.name,
                                    id: el.name, // Crucial for string-based referencing
                                    size: 3,
                                    face: 'x'
                                });
                            }
                            break;
                        case 'segment':
                            if (el.p1 && el.p2) {
                                board.create('segment', [[parseFloat(el.p1.x) || 0, parseFloat(el.p1.y) || 0], [parseFloat(el.p2.x) || 0, parseFloat(el.p2.y) || 0]], {
                                    ...style,
                                    name: el.name !== undefined && el.name !== '' ? el.name : undefined,
                                    withLabel: !!el.showLabels
                                });
                            }
                            break;
                        case 'line':
                            if (el.p1 && el.p2) {
                                board.create('line', [[parseFloat(el.p1.x) || 0, parseFloat(el.p1.y) || 0], [parseFloat(el.p2.x) || 0, parseFloat(el.p2.y) || 0]], {
                                    ...style,
                                    name: el.name !== undefined && el.name !== '' ? el.name : undefined,
                                    withLabel: !!el.showLabels
                                });
                            }
                            break;
                        case 'circle':
                            if (el.center && el.radius !== "") {
                                board.create('circle', [[parseFloat(el.center.x) || 0, parseFloat(el.center.y) || 0], parseFloat(el.radius) || 1], {
                                    ...style,
                                    center: {
                                        visible: !!el.showCenter,
                                        withLabel: !!el.showCenter,
                                        name: 'M',
                                        size: 3,
                                        face: 'x',
                                        strokeColor: '#000000',
                                        fillColor: 'transparent'
                                    }
                                });
                            }
                            break;
                        case 'vector':
                            if (el.p1 && el.p2) {
                                const x1 = parseFloat(el.p1.x) || 0;
                                const y1 = parseFloat(el.p1.y) || 0;
                                const x2 = parseFloat(el.p2.x) || 0;
                                const y2 = parseFloat(el.p2.y) || 0;
                                
                                // Draw the arrow itself using JSXGraph's native arrow creator
                                const arrow = board.create('arrow', [[x1, y1], [x2, y2]], {
                                    ...style,
                                    withLabel: false
                                });
                                
                                // Draw an invisible midpoint point to perfectly anchor the custom zentrierte HTML label
                                if (el.showLabels) {
                                    const vectorName = el.name !== undefined && el.name !== '' ? el.name : 'v';
                                    const labelText = `<span class="jxg-vector-label">${vectorName}</span>`;
                                    
                                    // Use dynamic functions so JSXGraph recalculates the midpoint when dragged
                                    const mx = () => (arrow.point1.X() + arrow.point2.X()) / 2;
                                    const my = () => (arrow.point1.Y() + arrow.point2.Y()) / 2;
                                    
                                    board.create('point', [mx, my], {
                                        visible: false,
                                        name: labelText,
                                        withLabel: true,
                                        label: {
                                            visible: true,
                                            autoPosition: false,
                                            display: 'html',
                                            fontSize: 14,
                                            anchorX: 'middle',
                                            anchorY: 'middle',
                                            offset: [0, 0]
                                        }
                                    });
                                }
                            }
                            break;
                        case 'angle':
                            if (el.p1 && el.center && el.p2) {
                                board.create('angle', [
                                    [parseFloat(el.p1.x) || 0, parseFloat(el.p1.y) || 0],
                                    [parseFloat(el.center.x) || 0, parseFloat(el.center.y) || 0],
                                    [parseFloat(el.p2.x) || 0, parseFloat(el.p2.y) || 0]
                                ], {
                                    ...style,
                                    type: el.isRightAngle ? 'sectordot' : 'sector',
                                    withLabel: !!el.showLabel,
                                    radius: 1.5,
                                    fillOpacity: 0.2
                                });
                            }
                            break;
                        case 'text':
                            if (el.text !== undefined) {
                                board.create('text', [parseFloat(el.x) || 0, parseFloat(el.y) || 0, el.text], {
                                    fontSize: parseFloat(el.fontSize) || 16,
                                    strokeColor: '#000000'
                                });
                            }
                            break;
                        case 'sector':
                            if (el.center && el.p1 && el.p2) {
                                board.create('sector', [
                                    [parseFloat(el.center.x) || 0, parseFloat(el.center.y) || 0],
                                    [parseFloat(el.p1.x) || 0, parseFloat(el.p1.y) || 0],
                                    [parseFloat(el.p2.x) || 0, parseFloat(el.p2.y) || 0]
                                ], {
                                    ...style,
                                    fillOpacity: parseFloat(el.fillOpacity) || 0,
                                    hasInnerBorders: !!el.showEdges,
                                    withLabel: false
                                });
                            }
                            break;
                        case 'polygon':
                            if (el.vertices && el.vertices.length > 0) {
                                // 1. Punkte explizit erzeugen, um Namen (A, B, C...) zu erzwingen
                                const polyPoints = el.vertices.map((v: any, idx: number) => {
                                    return board.create('point', [parseFloat(v.x) || 0, parseFloat(v.y) || 0], {
                                        name: String.fromCharCode(65 + idx), // Erzeugt automatisch A, B, C, D...
                                        visible: !!el.showVertices,
                                        withLabel: !!el.showVertices,
                                        size: 3,
                                        face: 'x',
                                        strokeColor: '#000000',
                                        fillColor: 'transparent',
                                        label: { autoPosition: true, fontSize: 14 }
                                    });
                                });

                                // 2. Polygon aus diesen Punkten erstellen
                                board.create('polygon', polyPoints, {
                                    ...style,
                                    fillOpacity: 0,
                                    borders: {
                                        ...style,
                                        withLabel: !!el.showEdges
                                    }
                                });
                            }
                            break;
                        case 'function':
                            if (el.expr && el.expr.trim() !== '') {
                                const compiled = win.math.compile(el.expr);
                                board.create('functiongraph', [
                                    function (x: number) { return compiled.evaluate({ x: x }); }
                                ], {
                                    ...style,
                                    name: el.name || '',
                                    withLabel: !!el.name,
                                    strokeWidth: 2,
                                    strokeColor: '#0f172a'
                                });
                            }
                            break;
                    }
                } catch (itemError) {
                    console.warn("Skipping geometry element due to error:", el, itemError);
                }
            });
        }

        // 2. Execute the custom code. 'board' is available in the scope
        if (geo.code) {
            try {
                const renderFunc = new Function('board', 'JXG', geo.code);
                renderFunc(board, win.JXG);
            } catch (codeError) {
                console.error("Error in custom JSXGraph code:", codeError);
            }
        }

        board.update();

        // Store board for cleanup
        if (!win.JXG.boards) win.JXG.boards = {};
        win.JXG.boards[boardId] = board;
    } catch (e) {
        console.error("JSXGraph Board Initialization Error:", e);
    }
}

export function init3DBoard(boardId: string, geo: any, win: any) {
    const container = document.getElementById(boardId);
    if (!container) return;

    try {
        if (win.JXG && win.JXG.boards && win.JXG.boards[boardId]) {
            win.JXG.JSXGraph.freeBoard(win.JXG.boards[boardId]);
            delete win.JXG.boards[boardId];
        }
        container.innerHTML = "";

        const bMin = Number(geo.settings.boxSize[0]) || -5;
        const bMax = Number(geo.settings.boxSize[1]) || 5;

        const board = win.JXG.JSXGraph.initBoard(boardId, {
            boundingbox: [-5, 5, 5, -5],
            keepaspectratio: false,
            axis: false,
            grid: false,
            showNavigation: true,
            showCopyright: false
        });

        const view = board.create('view3d',
            [
                [-5, -5], [10, 10],
                [[bMin, bMax], [bMin, bMax], [bMin, bMax]]
            ],
            {
                az: { angle: Number(geo.settings.az) || 0.4, slider: { visible: false } },
                el: { angle: Number(geo.settings.el) || 0.2, slider: { visible: false } },
                axesPosition: 'center',
                xAxis: { name: 'x', withLabel: true, label: { position: 'rt', offset: [5, 10] }, strokeColor: '#0f172a', strokeWidth: 2 },
                yAxis: { name: 'y', withLabel: true, strokeColor: '#0f172a', strokeWidth: 2 },
                zAxis: { name: 'z', withLabel: true, strokeColor: '#0f172a', strokeWidth: 2 },
                xPlaneRear: { visible: false },
                yPlaneRear: { visible: false },
                zPlaneRear: { visible: false }
            }
        );

        // Fix: Force immediate update of 2D projections (polygons) during interactive 3D rotation
        board.on('move', () => {
            board.update();
        });

        if (geo.elements) {
            geo.elements.forEach((el: any) => {
                try {
                    if (el.type === 'point3d') {
                        view.create('point3d', [Number(el.x) || 0, Number(el.y) || 0, Number(el.z) || 0], {
                            name: el.name || '',
                            withLabel: !!el.name,
                            size: 3,
                            fillColor: '#0f172a',
                            strokeColor: '#0f172a'
                        });
                    }
                    else if (el.type === 'vector3d') {
                        if (el.p1 && el.p2) {
                            const x1 = Number(el.p1.x) || 0, y1 = Number(el.p1.y) || 0, z1 = Number(el.p1.z) || 0;
                            const x2 = Number(el.p2.x) || 0, y2 = Number(el.p2.y) || 0, z2 = Number(el.p2.z) || 0;
                            view.create('line3d', [
                                [x1, y1, z1],
                                [x2 - x1, y2 - y1, z2 - z1],
                                [0, 1]
                            ], { lastArrow: true, strokeColor: '#0f172a', strokeWidth: 2 });
                        }
                    }
                    else if (el.type === 'line3d') {
                        if (el.p && el.v) {
                            view.create('line3d', [
                                [Number(el.p.x) || 0, Number(el.p.y) || 0, Number(el.p.z) || 0],
                                [Number(el.v.x) || 0, Number(el.v.y) || 0, Number(el.v.z) || 0],
                                [-20, 20]
                            ], { strokeColor: '#0f172a', strokeWidth: 2 });
                        }
                    }
                    else if (el.type === 'plane3d') {
                        const a = Number(el.a) || 0, b = Number(el.b) || 0, c = Number(el.c) || 0, d = Number(el.d) || 0;
                        let p = [0, 0, 0];
                        if (Math.abs(a) > 0.0001) p = [d / a, 0, 0];
                        else if (Math.abs(b) > 0.0001) p = [0, d / b, 0];
                        else if (Math.abs(c) > 0.0001) p = [0, 0, d / c];

                        let v1 = [0, 0, 0], v2 = [0, 0, 0];
                        if (Math.abs(a) >= Math.abs(b) && Math.abs(a) >= Math.abs(c)) {
                            v1 = [-b, a, 0]; v2 = [-c, 0, a];
                        } else if (Math.abs(b) >= Math.abs(a) && Math.abs(b) >= Math.abs(c)) {
                            v1 = [b, -a, 0]; v2 = [0, -c, b];
                        } else {
                            v1 = [c, 0, -a]; v2 = [0, c, -b];
                        }

                        view.create('plane3d', [
                            p, v1, v2, [-10, 10], [-10, 10]
                        ], { fillOpacity: 0.2, strokeColor: '#4f46e5', fillColor: '#94a3b8' });
                    }
                    else if (el.type === 'cuboid3d') {
                        const px = Number(el.p.x) || 0, py = Number(el.p.y) || 0, pz = Number(el.p.z) || 0;
                        const cw = Number(el.w) || 1, cd = Number(el.d) || 1, ch = Number(el.h) || 1;
                        const cv = [
                            [px, py, pz], [px + cw, py, pz], [px + cw, py + cd, pz], [px, py + cd, pz],
                            [px, py, pz + ch], [px + cw, py, pz + ch], [px + cw, py + cd, pz + ch], [px, py + cd, pz + ch]
                        ];
                        // Create 3D points first to ensure correct projection of the faces
                        const pts = cv.map((coords, i) => {
                            const pointName = String.fromCharCode(65 + i);
                            const coordStr = `(${coords[0]}|${coords[1]}|${coords[2]})`;
                            const pointProps = el.showVertices ? 
                                { name: pointName + coordStr, withLabel: true, size: 3, fillColor: '#0f172a', strokeColor: '#0f172a', label: { fontSize: 12, offset: [5, 5] } } :
                                { name: '', withLabel: false, size: 0, strokeWidth: 0, fillOpacity: 0, highlight: false, fixed: true };
                            return view.create('point3d', coords, pointProps);
                        });
                        const cuboidFaces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
                        cuboidFaces.forEach(f => {
                            board.create('polygon', f.map(i => pts[i].element2D), { 
                                fillOpacity: (el.fillOpacity !== undefined && el.fillOpacity !== "") ? Number(el.fillOpacity) : 0.1, 
                                strokeColor: '#0f172a', 
                                fillColor: '#94a3b8' 
                            });
                        });
                    }
                    else if (el.type === 'pyramid3d') {
                        const mx = Number(el.center.x) || 0, my = Number(el.center.y) || 0, mz = Number(el.center.z) || 0;
                        const ps = Number(el.s) || 1, ph = Number(el.h) || 1;
                        const hps = ps / 2;
                        const pv = [
                            [mx - hps, my - hps, mz], [mx + hps, my - hps, mz], [mx + hps, my + hps, mz], [mx - hps, my + hps, mz],
                            [mx, my, mz + ph]
                        ];
                        // Create 3D points first
                        const pts = pv.map((coords, i) => {
                            const pointName = i === 4 ? 'S' : String.fromCharCode(65 + i);
                            const coordStr = `(${coords[0]}|${coords[1]}|${coords[2]})`;
                            const pointProps = el.showVertices ? 
                                { name: pointName + coordStr, withLabel: true, size: 3, fillColor: '#0f172a', strokeColor: '#0f172a', label: { fontSize: 12, offset: [5, 5] } } :
                                { name: '', withLabel: false, size: 0, strokeWidth: 0, fillOpacity: 0, highlight: false, fixed: true };
                            return view.create('point3d', coords, pointProps);
                        });
                        const pyrFaces = [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]];
                        pyrFaces.forEach(f => {
                            board.create('polygon', f.map(i => pts[i].element2D), { 
                                fillOpacity: (el.fillOpacity !== undefined && el.fillOpacity !== "") ? Number(el.fillOpacity) : 0.1, 
                                strokeColor: '#0f172a', 
                                fillColor: '#94a3b8' 
                            });
                        });
                    }
                    else if (el.type === 'polyhedron3d') {
                        if (el.vertices && el.faces) {
                            const pts = el.vertices.map((v: any, i: number) => {
                                const coords = [Number(v.x) || 0, Number(v.y) || 0, Number(v.z) || 0];
                                const pointName = String.fromCharCode(65 + i);
                                const coordStr = `(${coords[0]}|${coords[1]}|${coords[2]})`;
                                const pointProps = el.showVertices ? 
                                    { name: pointName + coordStr, withLabel: true, size: 3, fillColor: '#0f172a', strokeColor: '#0f172a', label: { fontSize: 12, offset: [5, 5] } } :
                                    { name: '', withLabel: false, size: 0, strokeWidth: 0, fillOpacity: 0, highlight: false, fixed: true };
                                return view.create('point3d', coords, pointProps);
                            });
                            const pFaces = el.faces.split(';').map((f: string) => f.split(',').map(i => parseInt(i.trim())));
                            pFaces.forEach((f: any[]) => {
                                if (f.every(i => !isNaN(i) && pts[i])) {
                                    board.create('polygon', f.map(i => pts[i].element2D), { 
                                        fillOpacity: (el.fillOpacity !== undefined && el.fillOpacity !== "") ? Number(el.fillOpacity) : 0.1, 
                                        strokeColor: '#0f172a', 
                                        fillColor: '#94a3b8' 
                                    });
                                }
                            });
                        }
                    }
                } catch (err) {
                    console.error("Fehler beim Zeichnen von:", el, err);
                }
            });
        }

        // Execute custom 3D code
        if (geo.code) {
            try {
                const renderFunc = new Function('board', 'view', 'JXG', geo.code);
                renderFunc(board, view, win.JXG);
            } catch (codeError) {
                console.error("Error in custom JSXGraph 3D code:", codeError);
            }
        }

        board.update();

        // Store board for cleanup
        if (!win.JXG.boards) win.JXG.boards = {};
        win.JXG.boards[boardId] = board;

    } catch (e) {
        console.error("KRITISCHER JSXGraph 3D Fehler:", e);
    }
}
