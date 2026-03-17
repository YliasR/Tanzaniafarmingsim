// ============================================================
// First Person Controller
// ============================================================

const player = {
  pos: new THREE.Vector3(0, 1.7, 8),
  vel: new THREE.Vector3(),
  yaw: Math.PI,   // start facing inward toward the farm
  pitch: 0,
  onGround: true,
};

const WALK_SPEED  = 7;
const SPRINT_SPEED = 15;
const JUMP_FORCE  = 6;
const GRAVITY     = -22;
const EYE_HEIGHT  = 1.7;

const keys = {};
window.addEventListener('keydown', e => {
  if (keys[e.code]) return; // ignore key-repeat
  keys[e.code] = true;
  if (e.code === 'KeyN') toggleNokia();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// ---- Pointer lock ----
let pointerLocked = false;

container.addEventListener('click', () => {
  // Only request lock when the info overlay is already dismissed
  if (!pointerLocked && document.getElementById('menu-overlay').classList.contains('hidden')) {
    container.requestPointerLock();
  }
});
document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === container;
});
document.addEventListener('mousemove', e => {
  if (!pointerLocked) return;
  player.yaw   -= e.movementX * 0.002;
  player.pitch -= e.movementY * 0.002;
  player.pitch  = Math.max(-1.3, Math.min(1.3, player.pitch));
});

// ---- Terrain height (mirrors scene.js groundAt — raised bed surface inside farm) ----
function getGroundHeight(x, z) {
  if (x >= FARM_ORIGIN_X && x <= FARM_ORIGIN_X + FARM_COLS * CELL_SIZE &&
      z >= FARM_ORIGIN_Z && z <= FARM_ORIGIN_Z + FARM_ROWS * CELL_SIZE) {
    return FARM_SURFACE_Y;
  }
  return Math.sin(x * 0.05) * 0.8 + Math.cos(z * 0.04) * 0.6;
}

// ---- Per-frame player update ----
function updatePlayer(dt) {
  const speed  = (keys['ShiftLeft'] || keys['ShiftRight']) ? SPRINT_SPEED : WALK_SPEED;
  const cosY   = Math.cos(player.yaw);
  const sinY   = Math.sin(player.yaw);

  // Derive forward and right from yaw only (no pitch influence on movement)
  const fwdX = -sinY,  fwdZ = -cosY;
  const rgtX =  cosY,  rgtZ = -sinY;

  const move = new THREE.Vector3();
  if (keys['KeyW'] || keys['ArrowUp'])    move.add(new THREE.Vector3(fwdX, 0, fwdZ));
  if (keys['KeyS'] || keys['ArrowDown'])  move.add(new THREE.Vector3(-fwdX, 0, -fwdZ));
  if (keys['KeyA'] || keys['ArrowLeft'])  move.add(new THREE.Vector3(-rgtX, 0, -rgtZ));
  if (keys['KeyD'] || keys['ArrowRight']) move.add(new THREE.Vector3(rgtX, 0, rgtZ));
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);

  player.vel.x = move.x;
  player.vel.z = move.z;

  // Jump — checked before onGround is reset so the flag is from the previous frame
  if (keys['Space'] && player.onGround) {
    player.vel.y   = JUMP_FORCE;
    player.onGround = false;
  }

  // Gravity always acts — ground check below corrects position and zeroes vel
  player.vel.y += GRAVITY * dt;

  // Integrate
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  player.pos.z += player.vel.z * dt;

  // World bounds
  player.pos.x = Math.max(-280, Math.min(280, player.pos.x));
  player.pos.z = Math.max(-280, Math.min(280, player.pos.z));

  // Building collisions (AABB push-out)
  const PR = 0.5; // player radius
  for (const box of worldColliders) {
    if (player.pos.x > box.x1 - PR && player.pos.x < box.x2 + PR &&
        player.pos.z > box.z1 - PR && player.pos.z < box.z2 + PR) {
      const cx = (box.x1 + box.x2) / 2, cz = (box.z1 + box.z2) / 2;
      const hw = (box.x2 - box.x1) / 2 + PR, hd = (box.z2 - box.z1) / 2 + PR;
      const dx = player.pos.x - cx,         dz = player.pos.z - cz;
      if (Math.abs(dx) / hw > Math.abs(dz) / hd) {
        player.pos.x = cx + Math.sign(dx) * hw;
      } else {
        player.pos.z = cz + Math.sign(dz) * hd;
      }
    }
  }

  // Ground collision — reset onGround every frame; only re-set when actually touching
  player.onGround = false;
  const gh = getGroundHeight(player.pos.x, player.pos.z);
  if (player.pos.y <= gh + EYE_HEIGHT) {
    player.pos.y   = gh + EYE_HEIGHT;
    player.vel.y   = 0;
    player.onGround = true;
  }
}
