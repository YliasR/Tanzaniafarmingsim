// ============================================================
// Land Expansion — Phase 7A
// ============================================================

// Existing farm: X [-7.5 .. 7.5], Z [10.0 .. 22.0] (10 cols x 8 rows x 1.5m)

const LAND_PLOTS = [
  { id: 'east',      name: 'East Field',      type: 'fertile',   ox: 7.5,  oz: 10.0, cols: 8,  rows: 8,  price: 800,  growMult: 1.0,  soilColor: 0x5a3010 },
  { id: 'north',     name: 'North Strip',      type: 'fertile',   ox: -7.5, oz: 22.0, cols: 10, rows: 5,  price: 600,  growMult: 1.0,  soilColor: 0x5a3010 },
  { id: 'south',     name: 'South Savanna',     type: 'savanna',   ox: -7.5, oz: 0.5,  cols: 10, rows: 6,  price: 400,  growMult: 0.7,  soilColor: 0x7a5a20 },
  { id: 'riverside', name: 'Riverside Plot',    type: 'riverside', ox: 7.5,  oz: 22.0, cols: 8,  rows: 5,  price: 1500, growMult: 1.4,  soilColor: 0x3a2a15 },
  { id: 'fareast',   name: 'Far East Savanna',  type: 'savanna',   ox: 19.5, oz: 10.0, cols: 6,  rows: 8,  price: 500,  growMult: 0.7,  soilColor: 0x7a5a20 },
];

// Prerequisites: which plots must be owned before this one is available
const PLOT_PREREQS = {
  east:      [],
  south:     [],
  north:     ['east'],
  riverside: ['north'],
  fareast:   ['east'],
};

const ownedPlots = {};
// Maps plotId -> { cellOffset, count } — index range in the global farmCells array
const plotCellRanges = {};
// 3D meshes for cleanup
const plotMeshes = {};
// "For sale" sign meshes
const plotSigns = {};

// ============================================================
// Override groundAt to include owned plots
// ============================================================
const _origGroundAt = groundAt;
groundAt = function(x, z) {
  for (const plot of LAND_PLOTS) {
    if (!ownedPlots[plot.id]) continue;
    const maxX = plot.ox + plot.cols * CELL_SIZE;
    const maxZ = plot.oz + plot.rows * CELL_SIZE;
    if (x >= plot.ox && x <= maxX && z >= plot.oz && z <= maxZ) return FARM_SURFACE_Y;
  }
  return _origGroundAt(x, z);
};

// ============================================================
// Override getGroundHeight (controls.js) to include owned plots
// ============================================================
const _origGetGroundHeight = getGroundHeight;
getGroundHeight = function(x, z) {
  for (const plot of LAND_PLOTS) {
    if (!ownedPlots[plot.id]) continue;
    const maxX = plot.ox + plot.cols * CELL_SIZE;
    const maxZ = plot.oz + plot.rows * CELL_SIZE;
    if (x >= plot.ox && x <= maxX && z >= plot.oz && z <= maxZ) return FARM_SURFACE_Y;
  }
  return _origGetGroundHeight(x, z);
};

// ============================================================
// Override cellAt to check expansion plots
// ============================================================
const _origCellAt = cellAt;
cellAt = function(wx, wz) {
  // Check original farm first
  const orig = _origCellAt(wx, wz);
  if (orig >= 0) return orig;
  // Check expansion plots
  for (const plot of LAND_PLOTS) {
    if (!ownedPlots[plot.id]) continue;
    const range = plotCellRanges[plot.id];
    if (!range) continue;
    const col = Math.floor((wx - plot.ox) / CELL_SIZE);
    const row = Math.floor((wz - plot.oz) / CELL_SIZE);
    if (col >= 0 && col < plot.cols && row >= 0 && row < plot.rows) {
      return range.cellOffset + row * plot.cols + col;
    }
  }
  return -1;
};

// ============================================================
// Build plot ground mesh (raised bed + furrows + decoration)
// ============================================================
function buildPlotGround(plot) {
  const group = new THREE.Group();
  const farmW = plot.cols * CELL_SIZE;
  const farmD = plot.rows * CELL_SIZE;
  const cx = plot.ox + farmW * 0.5;
  const cz = plot.oz + farmD * 0.5;

  // Sample terrain across the plot to find the lowest point
  let minGround = Infinity;
  for (let sx = plot.ox; sx <= plot.ox + farmW; sx += CELL_SIZE) {
    for (let sz = plot.oz; sz <= plot.oz + farmD; sz += CELL_SIZE) {
      const h = _origGroundAt(sx, sz);
      if (h < minGround) minGround = h;
    }
  }

  // Raised bed extends from well below the lowest terrain point up to FARM_SURFACE_Y
  const bedTop    = FARM_SURFACE_Y;
  const bedBottom = Math.min(minGround - 0.5, FLAT_FARM_Y - 0.5);
  const bedH      = bedTop - bedBottom;
  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(farmW + 0.5, bedH, farmD + 0.5),
    new THREE.MeshLambertMaterial({ color: plot.soilColor })
  );
  soil.position.set(cx, bedTop - bedH * 0.5, cz);
  soil.receiveShadow = true;
  group.add(soil);

  // Furrows
  const furrowMat = new THREE.MeshLambertMaterial({ color: plot.type === 'savanna' ? 0x5a3a10 : 0x3a1a05 });
  for (let r = 0; r <= plot.rows; r++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(farmW, 0.05), furrowMat);
    f.rotation.x = -Math.PI / 2;
    f.position.set(cx, FARM_SURFACE_Y + 0.01, plot.oz + r * CELL_SIZE);
    group.add(f);
  }
  for (let c = 0; c <= plot.cols; c++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.05, farmD), furrowMat);
    f.rotation.x = -Math.PI / 2;
    f.position.set(plot.ox + c * CELL_SIZE, FARM_SURFACE_Y + 0.01, cz);
    group.add(f);
  }

  // Type-specific decoration
  if (plot.type === 'savanna') {
    // Dry grass tufts along edges
    const grassMat = new THREE.MeshLambertMaterial({ color: 0xb8a850 });
    for (let i = 0; i < 12; i++) {
      const tuft = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.35, 4),
        grassMat
      );
      const edge = Math.random() > 0.5;
      const tx = edge
        ? (Math.random() > 0.5 ? plot.ox - 0.3 : plot.ox + farmW + 0.3)
        : plot.ox + Math.random() * farmW;
      const tz = edge
        ? plot.oz + Math.random() * farmD
        : (Math.random() > 0.5 ? plot.oz - 0.3 : plot.oz + farmD + 0.3);
      const tgy = _origGroundAt(tx, tz);
      tuft.position.set(tx, tgy + 0.15, tz);
      group.add(tuft);
    }
  }

  if (plot.type === 'riverside') {
    // Blue water channel along the north edge
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x2288aa, transparent: true, opacity: 0.65
    });
    const channel = new THREE.Mesh(
      new THREE.BoxGeometry(farmW + 1, 0.08, 0.6),
      waterMat
    );
    channel.position.set(cx, FARM_SURFACE_Y + 0.02, plot.oz + farmD + 0.4);
    group.add(channel);

    // Small rocks along channel
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
    for (let i = 0; i < 8; i++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.08, 0),
        rockMat
      );
      rock.position.set(
        plot.ox + Math.random() * farmW,
        FARM_SURFACE_Y + 0.06,
        plot.oz + farmD + 0.3 + (Math.random() - 0.5) * 0.4
      );
      group.add(rock);
    }
  }

  scene.add(group);
  plotMeshes[plot.id] = group;
}

// ============================================================
// Add cells to global farmCells for this plot
// ============================================================
function addPlotCells(plot) {
  const offset = farmCells.length;
  for (let row = 0; row < plot.rows; row++) {
    for (let col = 0; col < plot.cols; col++) {
      farmCells.push({
        seedType:    -1,
        stage:       -1,
        nextStageAt:  0,
        watered:      false,
        mesh:         null,
        cx: plot.ox + col * CELL_SIZE + CELL_SIZE * 0.5,
        cz: plot.oz + row * CELL_SIZE + CELL_SIZE * 0.5,
        growMult: plot.growMult,
        plotId: plot.id,
        autoWater: plot.type === 'riverside',
      });
    }
  }
  plotCellRanges[plot.id] = { cellOffset: offset, count: plot.cols * plot.rows };
}

// ============================================================
// "For Sale" sign posts at each unowned plot
// ============================================================
function buildSaleSign(plot) {
  const g = new THREE.Group();
  const farmW = plot.cols * CELL_SIZE;
  const farmD = plot.rows * CELL_SIZE;
  const signX = plot.ox + farmW * 0.5;
  const signZ = plot.oz + farmD * 0.5;
  const signY = _origGroundAt(signX, signZ);

  // Wooden post
  const postMat = new THREE.MeshLambertMaterial({ color: 0x6b4a1a });
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 2.0, 5),
    postMat
  );
  post.position.set(signX, signY + 1.0, signZ);
  post.castShadow = true;
  g.add(post);

  // Sign board with canvas text
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5e6c8';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#5a3a10';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 124);
  ctx.fillStyle = '#3a1a05';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FOR SALE', 128, 36);
  ctx.font = '18px monospace';
  ctx.fillText(plot.name, 128, 62);
  ctx.fillStyle = '#aa5500';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('TSh ' + plot.price, 128, 90);
  const typeLabel = plot.type === 'fertile' ? 'Fertile' : plot.type === 'riverside' ? 'Riverside' : 'Savanna';
  ctx.fillStyle = '#666';
  ctx.font = '14px monospace';
  ctx.fillText(typeLabel + ' — ' + plot.cols + 'x' + plot.rows + ' cells', 128, 116);

  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide })
  );
  signMesh.position.set(signX, signY + 2.1, signZ);
  g.add(signMesh);

  // Corner marker stakes
  const stakeMat = new THREE.MeshLambertMaterial({ color: 0xff6622 });
  const corners = [
    [plot.ox, plot.oz],
    [plot.ox + farmW, plot.oz],
    [plot.ox + farmW, plot.oz + farmD],
    [plot.ox, plot.oz + farmD],
  ];
  for (const [sx, sz] of corners) {
    const sy = _origGroundAt(sx, sz);
    const stake = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 1.0, 4),
      stakeMat
    );
    stake.position.set(sx, sy + 0.5, sz);
    g.add(stake);
  }

  scene.add(g);
  plotSigns[plot.id] = g;
}

function removeSaleSign(plotId) {
  if (plotSigns[plotId]) {
    scene.remove(plotSigns[plotId]);
    delete plotSigns[plotId];
  }
}

// ============================================================
// Buy a land plot
// ============================================================
function buyLandPlot(plotId) {
  const plot = LAND_PLOTS.find(p => p.id === plotId);
  if (!plot || ownedPlots[plotId]) return;
  if (playerMoney < plot.price) return;

  // Check prerequisites
  const prereqs = PLOT_PREREQS[plotId] || [];
  for (const req of prereqs) {
    if (!ownedPlots[req]) return;
  }

  playerMoney -= plot.price;
  ownedPlots[plotId] = true;

  buildPlotGround(plot);
  addPlotCells(plot);
  removeSaleSign(plotId);

  // Refresh signs — buying a plot may unlock new ones
  refreshSaleSigns();

  renderShop();
  updateMoneyHUD();
}

// ============================================================
// Rebuild a plot from save data (ground + cells already in farmCells)
// ============================================================
function rebuildOwnedPlot(plotId) {
  const plot = LAND_PLOTS.find(p => p.id === plotId);
  if (!plot) return;
  buildPlotGround(plot);
  removeSaleSign(plotId);
}

// ============================================================
// Shop section for land
// ============================================================
function renderShopLand() {
  const el = document.getElementById('shop-land');
  if (!el) return;
  el.innerHTML = '';

  for (const plot of LAND_PLOTS) {
    const owned = ownedPlots[plot.id];
    const prereqs = PLOT_PREREQS[plot.id] || [];
    const locked = prereqs.some(req => !ownedPlots[req]);
    const typeTag = plot.type === 'fertile' ? 'Fertile'
      : plot.type === 'riverside' ? 'Riverside +40%'
      : 'Savanna -30%';

    let btnText, disabled;
    if (owned) { btnText = 'OWNED'; disabled = true; }
    else if (locked) { btnText = 'LOCKED'; disabled = true; }
    else { btnText = 'BUY'; disabled = false; }

    el.innerHTML += `
      <div class="trade-row">
        <span class="trade-item">${plot.name} <small style="color:#888">(${typeTag})</small></span>
        <span class="trade-price">TSh ${plot.price}</span>
        <span class="trade-own">${plot.cols}x${plot.rows}</span>
        <button class="trade-btn" onclick="buyLandPlot('${plot.id}')" ${disabled ? 'disabled' : ''}>
          ${btnText}
        </button>
      </div>`;
  }
}

// ============================================================
// Refresh sale signs — show signs for available (unlocked) unowned plots
// ============================================================
function refreshSaleSigns() {
  for (const plot of LAND_PLOTS) {
    if (ownedPlots[plot.id]) {
      removeSaleSign(plot.id);
      continue;
    }
    const prereqs = PLOT_PREREQS[plot.id] || [];
    const locked = prereqs.some(req => !ownedPlots[req]);
    if (locked) {
      removeSaleSign(plot.id);
    } else if (!plotSigns[plot.id]) {
      buildSaleSign(plot);
    }
  }
}

// ============================================================
// Init — build sale signs for initially available plots
// ============================================================
refreshSaleSigns();
