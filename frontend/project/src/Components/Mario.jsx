import { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════
//  LEAP & ROAM — original side-scrolling platformer
//  Tile grid legend:
//   . = empty   # = ground/brick   ^ = spike (hazard)
//   = = platform (thin, one-tile)  B = breakable-look block
//   C = coin    G = goblin-style enemy spawn   F = flag (goal)
//   P = player start   ~ = pit marker (visual only, same as .)
// ═══════════════════════════════════════════════════════

const TILE = 32;

// Every level below is physics-verified offline: row widths are uniform,
// the flag is reachable via jumps/steps within this engine's actual jump
// arc (~2.6 tile rise, ~4.8 tile carry), every gap is ≤3 tiles, and every
// enemy spawns on solid ground.
const LEVELS = [
  {
    name: "Meadow Mile",
    sky: ["#ffd9a0", "#ff9f6b"],
    hill: "#c97b4a",
    theme: "meadow",
    rows: [
      "................................................",
      "................................................",
      "................................................",
      "................................................",
      "................................................",
      "..........................................F.....",
      ".......................................#########",
      ".....CCC..........CC................###.........",
      ".P...###.....G....###.....G......###............",
      "################################################",
    ],
  },
  {
    name: "Cliffside Climb",
    sky: ["#bfe3ff", "#7fb8e8"],
    hill: "#5b86a8",
    theme: "cliff",
    rows: [
      "................................................",
      "................................................",
      "................................................",
      "................................................",
      "................................................",
      "................................................",
      "......C.C.....................................F.",
      ".........................CC.................###.",
      ".P.......G............G..###.....^^...G..###....",
      "###############...###########################...",
    ],
  },
  {
    name: "Ember Hollow",
    sky: ["#3a1f3d", "#7a2e3a"],
    hill: "#2a1424",
    theme: "ember",
    rows: [
      "................................................",
      "................................................",
      "................................................",
      "................................................",
      "................................................",
      "............................................F...",
      "....C.C..................................#######",
      ".................CC...................###.......",
      ".P.......^.......###G.........===^.###...G......",
      "#############...###########..################...",
    ],
  },
];

const GRAVITY = 0.55;
const MOVE_ACCEL = 0.55;
const MAX_RUN = 4.4;
const FRICTION = 0.82;
const JUMP_VELOCITY = -9.6;
const JUMP_CUT = 0.5;
const ENEMY_SPEED = 1.1;

function parseLevel(level) {
  const rows = level.rows;
  const h = rows.length, w = rows[0].length;
  const tiles = [];
  const coins = [];
  const enemies = [];
  let player = { x: 1 * TILE, y: 1 * TILE };
  let flag = null;

  for (let r = 0; r < h; r++) {
    tiles.push([]);
    for (let c = 0; c < w; c++) {
      const ch = rows[r][c];
      let t = ".";
      if (ch === "#" || ch === "=") t = ch;
      tiles[r].push(t);
      if (ch === "C") coins.push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, taken: false, id: `${r}-${c}` });
      if (ch === "G") enemies.push({ x: c * TILE, y: r * TILE, dir: -1, alive: true, id: `${r}-${c}`, baseRow: r });
      if (ch === "P") player = { x: c * TILE, y: r * TILE };
      if (ch === "F") flag = { x: c * TILE, y: r * TILE };
      if (ch === "^") tiles[r][c] = "^";
    }
  }
  return { tiles, coins, enemies, player, flag, w: w * TILE, h: h * TILE, rowsText: rows };
}

function solidAt(tiles, col, row) {
  if (row < 0 || row >= tiles.length || col < 0 || col >= tiles[0].length) return false;
  return tiles[row][col] === "#";
}
function thinAt(tiles, col, row) {
  if (row < 0 || row >= tiles.length || col < 0 || col >= tiles[0].length) return false;
  return tiles[row][col] === "=";
}
function spikeAt(tiles, col, row) {
  if (row < 0 || row >= tiles.length || col < 0 || col >= tiles[0].length) return false;
  return tiles[row][col] === "^";
}

// ═══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function Mario() {
  const [screen, setScreen] = useState("menu"); // menu | play | win | dead | clear
  const [levelIdx, setLevelIdx] = useState(0);
  const [unlocked, setUnlocked] = useState(1);
  const [hud, setHud] = useState({ coins: 0, lives: 3, score: 0, levelName: "" });
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const keysRef = useRef({});
  const rafRef = useRef(null);

  const startLevel = useCallback((idx) => {
    const level = LEVELS[idx];
    const parsed = parseLevel(level);
    stateRef.current = {
      level, parsed,
      player: {
        x: parsed.player.x, y: parsed.player.y,
        vx: 0, vy: 0, w: 22, h: 28,
        onGround: false, facing: 1, anim: 0, dead: false, won: false,
        invuln: 0,
      },
      coins: parsed.coins.map(c => ({ ...c })),
      enemies: parsed.enemies.map(e => ({ ...e })),
      camera: 0,
      collected: 0,
      score: 0,
      lives: 3,
      time: 0,
      particles: [],
      done: false,
    };
    setHud({ coins: 0, lives: 3, score: 0, levelName: level.name });
    setLevelIdx(idx);
    setScreen("play");
  }, []);

  // ── Input
  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.code] = true;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    };
    const up = (e) => { keysRef.current[e.code] = false; };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // ── Game loop
  useEffect(() => {
    if (screen !== "play") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let lastTime = performance.now();

    function loop(now) {
      const dt = Math.min((now - lastTime) / 16.67, 2);
      lastTime = now;
      update(dt);
      render(ctx, canvas.width, canvas.height);
      rafRef.current = requestAnimationFrame(loop);
    }

    function update(dt) {
      const st = stateRef.current;
      if (!st || st.done) return;
      const p = st.player;
      const keys = keysRef.current;
      const { tiles } = st.parsed;
      const cols = tiles[0].length, rowsN = tiles.length;

      if (!p.dead && !p.won) {
        // horizontal input
        const left = keys["ArrowLeft"] || keys["KeyA"];
        const right = keys["ArrowRight"] || keys["KeyD"];
        if (left && !right) { p.vx -= MOVE_ACCEL * dt; p.facing = -1; }
        else if (right && !left) { p.vx += MOVE_ACCEL * dt; p.facing = 1; }
        else { p.vx *= Math.pow(FRICTION, dt); if (Math.abs(p.vx) < 0.04) p.vx = 0; }
        p.vx = Math.max(-MAX_RUN, Math.min(MAX_RUN, p.vx));

        // jump
        const jumpPressed = keys["Space"] || keys["ArrowUp"] || keys["KeyW"];
        if (jumpPressed && p.onGround && !p.jumpHeld) {
          p.vy = JUMP_VELOCITY;
          p.onGround = false;
          p.jumpHeld = true;
        }
        if (!jumpPressed) {
          if (p.vy < JUMP_VELOCITY * JUMP_CUT && !p.onGround) p.vy = JUMP_VELOCITY * JUMP_CUT;
          p.jumpHeld = false;
        }

        p.vy += GRAVITY * dt;
        p.vy = Math.min(p.vy, 14);

        // move + collide X
        let nx = p.x + p.vx * dt;
        moveAxis(p, nx, p.y, tiles, "x");
        // move + collide Y
        let ny = p.y + p.vy * dt;
        p.onGround = false;
        moveAxis(p, p.x, ny, tiles, "y");

        if (p.invuln > 0) p.invuln -= dt;
        p.anim += Math.abs(p.vx) * 0.25 * dt + (p.onGround ? 0 : 0);

        // fell into pit
        if (p.y > rowsN * TILE + 80) {
          damagePlayer(st, true);
        }

        // spikes
        const fcol = Math.floor((p.x + p.w / 2) / TILE);
        const frow = Math.floor((p.y + p.h - 2) / TILE);
        if (spikeAt(tiles, fcol, frow) && p.invuln <= 0) damagePlayer(st, false);

        // coins
        st.coins.forEach(c => {
          if (c.taken) return;
          const dx = (p.x + p.w / 2) - c.x, dy = (p.y + p.h / 2) - c.y;
          if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
            c.taken = true;
            st.collected += 1;
            st.score += 100;
          }
        });

        // enemies
        st.enemies.forEach(en => {
          if (!en.alive) return;
          en.x += en.dir * ENEMY_SPEED * dt;
          const ecol = Math.floor((en.x + 14) / TILE);
          const erowBelow = Math.floor((en.y + 30) / TILE);
          const aheadCol = Math.floor((en.x + (en.dir > 0 ? 30 : -2)) / TILE);
          if (!solidAt(tiles, aheadCol, erowBelow) || solidAt(tiles, aheadCol, erowBelow - 1)) {
            en.dir *= -1;
          }
          // collision with player
          if (p.invuln <= 0 && rectsOverlap(p.x, p.y, p.w, p.h, en.x, en.y, 26, 24)) {
            const stomp = (p.vy > 0) && (p.y + p.h - en.y < 16);
            if (stomp) {
              en.alive = false;
              p.vy = JUMP_VELOCITY * 0.6;
              st.score += 200;
              spawnBurst(st, en.x + 13, en.y + 12);
            } else {
              damagePlayer(st, false);
            }
          }
        });

        // flag / goal
        const flag = st.parsed.flag;
        if (flag && rectsOverlap(p.x, p.y, p.w, p.h, flag.x, flag.y - TILE, 18, TILE * 2)) {
          p.won = true;
          st.done = true;
          st.score += 500 + st.collected * 0;
          setTimeout(() => onLevelClear(), 500);
        }

        // camera
        const viewW = canvas.width;
        let cam = p.x - viewW / 2;
        cam = Math.max(0, Math.min(cam, st.parsed.w - viewW));
        st.camera = cam;
      }

      // particles
      st.particles.forEach(pt => { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 0.3 * dt; pt.life -= dt; });
      st.particles = st.particles.filter(pt => pt.life > 0);

      setHud(h => (h.coins !== st.collected || h.score !== st.score || h.lives !== st.lives)
        ? { ...h, coins: st.collected, score: st.score, lives: st.lives }
        : h);
    }

    function moveAxis(p, nx, ny, tiles, axis) {
      if (axis === "x") {
        const dir = nx > p.x ? 1 : -1;
        const testX = dir > 0 ? nx + p.w : nx;
        const colEdge = Math.floor(testX / TILE);
        const rowTop = Math.floor((p.y + 2) / TILE);
        const rowBot = Math.floor((p.y + p.h - 2) / TILE);
        let blocked = false;
        for (let r = rowTop; r <= rowBot; r++) {
          if (solidAt(tiles, colEdge, r)) blocked = true;
        }
        if (blocked) {
          p.x = dir > 0 ? colEdge * TILE - p.w : (colEdge + 1) * TILE;
          p.vx = 0;
        } else {
          p.x = Math.max(0, nx);
        }
      } else {
        const dir = ny > p.y ? 1 : -1;
        const testY = dir > 0 ? ny + p.h : ny;
        const rowEdge = Math.floor(testY / TILE);
        const colL = Math.floor((p.x + 3) / TILE);
        const colR = Math.floor((p.x + p.w - 3) / TILE);
        let blocked = false;
        for (let c = colL; c <= colR; c++) {
          if (solidAt(tiles, c, rowEdge)) blocked = true;
          if (dir > 0 && thinAt(tiles, c, rowEdge) && p.vy >= 0 && p.y + p.h <= rowEdge * TILE + 8) blocked = true;
        }
        if (blocked) {
          if (dir > 0) { p.y = rowEdge * TILE - p.h; p.onGround = true; }
          else { p.y = (rowEdge + 1) * TILE; }
          p.vy = 0;
        } else {
          p.y = ny;
        }
      }
    }

    function damagePlayer(st, fell) {
      const p = st.player;
      if (p.invuln > 0 || p.dead) return;
      st.lives -= 1;
      if (st.lives <= 0) {
        p.dead = true;
        st.done = true;
        setTimeout(() => onLevelFail(), 600);
      } else {
        p.invuln = 90;
        if (fell) {
          p.x = st.parsed.player.x;
          p.y = st.parsed.player.y;
          p.vx = 0; p.vy = 0;
        } else {
          p.vy = JUMP_VELOCITY * 0.5;
          p.vx = -p.facing * 3;
        }
      }
    }

    function spawnBurst(st, x, y) {
      for (let i = 0; i < 6; i++) {
        st.particles.push({
          x, y, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3 - 1, life: 24, color: "#e9c873",
        });
      }
    }

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function render(ctx, vw, vh) {
      const st = stateRef.current;
      if (!st) return;
      const { level, parsed } = st;
      const cam = st.camera;

      // sky
      const grad = ctx.createLinearGradient(0, 0, 0, vh);
      grad.addColorStop(0, level.sky[0]);
      grad.addColorStop(1, level.sky[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, vw, vh);

      // parallax hills
      ctx.fillStyle = level.hill;
      ctx.globalAlpha = 0.55;
      drawHillBand(ctx, vw, vh, cam * 0.3, vh * 0.62, 70, 60);
      ctx.globalAlpha = 0.85;
      drawHillBand(ctx, vw, vh, cam * 0.55, vh * 0.74, 90, 46);
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(-cam, 0);

      // tiles
      const tiles = parsed.tiles;
      const colStart = Math.max(0, Math.floor(cam / TILE) - 1);
      const colEnd = Math.min(tiles[0].length, Math.ceil((cam + vw) / TILE) + 1);
      for (let r = 0; r < tiles.length; r++) {
        for (let c = colStart; c < colEnd; c++) {
          const t = tiles[r][c];
          const x = c * TILE, y = r * TILE;
          if (t === "#") drawGroundTile(ctx, x, y, level.theme, r === 0 || tiles[r - 1][c] !== "#");
          else if (t === "=") drawPlatformTile(ctx, x, y, level.theme);
          else if (t === "^") drawSpike(ctx, x, y, level.theme);
        }
      }

      // flag
      if (parsed.flag) drawFlag(ctx, parsed.flag.x, parsed.flag.y);

      // coins
      st.coins.forEach(c => { if (!c.taken) drawCoin(ctx, c.x, c.y, st.time); });

      // enemies
      st.enemies.forEach(en => { if (en.alive) drawEnemy(ctx, en.x, en.y, en.dir, level.theme); });

      // particles
      st.particles.forEach(pt => {
        ctx.globalAlpha = Math.max(0, pt.life / 24);
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      });

      // player
      drawPlayer(ctx, st.player);

      ctx.restore();
      st.time += 1;
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [screen]);

  function onLevelClear() {
    setUnlocked(u => Math.max(u, levelIdx + 2));
    setScreen("clear");
  }
  function onLevelFail() {
    setScreen("dead");
  }

  if (screen === "menu") {
    return <LevelSelect unlocked={unlocked} onPick={startLevel} />;
  }

  return (
    <div style={S.page}>
      <style>{CSS}</style>
      <div style={S.hudBar}>
        <button style={S.hudBtn} onClick={() => setScreen("menu")}>⌂ Menu</button>
        <div style={S.hudTitle}>{hud.levelName}</div>
        <div style={S.hudStats}>
          <span>★ {hud.score}</span>
          <span>◉ {hud.coins}</span>
          <span>{"♥".repeat(Math.max(0, hud.lives))}{"♡".repeat(Math.max(0, 3 - hud.lives))}</span>
        </div>
      </div>

      <div style={S.canvasWrap}>
        <canvas ref={canvasRef} width={760} height={420} style={S.canvas} />

        {screen === "dead" && (
          <Overlay
            title="Out of hearts"
            sub="That stretch got the better of you."
            primaryLabel="Retry level"
            onPrimary={() => startLevel(levelIdx)}
            secondaryLabel="Level select"
            onSecondary={() => setScreen("menu")}
            tone="#c8372f"
          />
        )}
        {screen === "clear" && (
          <Overlay
            title="Level cleared!"
            sub={`Collected ${hud.coins} coin${hud.coins === 1 ? "" : "s"} · Score ${hud.score}`}
            primaryLabel={levelIdx + 1 < LEVELS.length ? "Next level" : "Back to map"}
            onPrimary={() => {
              if (levelIdx + 1 < LEVELS.length) startLevel(levelIdx + 1);
              else setScreen("menu");
            }}
            secondaryLabel="Level select"
            onSecondary={() => setScreen("menu")}
            tone="#1f8a4c"
          />
        )}
      </div>

      <div style={S.controlsHint}>
        ← → / A D move · Space / ↑ / W jump (hold for higher) · Stomp enemies from above
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  DRAWING HELPERS (canvas)
// ═══════════════════════════════════════════════════════
function drawHillBand(ctx, vw, vh, offset, baseY, amp, freq) {
  ctx.beginPath();
  ctx.moveTo(0, vh);
  for (let x = 0; x <= vw; x += 8) {
    const y = baseY - Math.sin((x + offset) / freq) * amp * 0.3 - amp * 0.2;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(vw, vh);
  ctx.closePath();
  ctx.fill();
}

const THEME_TILES = {
  meadow: { top: "#7fb24a", body: "#8a5a3a", trim: "#5e3d27" },
  cliff:  { top: "#d8d2c0", body: "#8a8270", trim: "#5f594a" },
  ember:  { top: "#6b2230", body: "#3a1820", trim: "#1f0e13" },
};

function drawGroundTile(ctx, x, y, theme, showTop) {
  const t = THEME_TILES[theme];
  ctx.fillStyle = t.body;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = t.trim;
  ctx.fillRect(x, y + TILE - 4, TILE, 4);
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  if (showTop) {
    ctx.fillStyle = t.top;
    ctx.fillRect(x, y, TILE, 7);
  }
}

function drawPlatformTile(ctx, x, y, theme) {
  const t = THEME_TILES[theme];
  ctx.fillStyle = t.trim;
  ctx.fillRect(x, y + 10, TILE, 8);
  ctx.fillStyle = t.top;
  ctx.fillRect(x, y + 8, TILE, 4);
}

function drawSpike(ctx, x, y, theme) {
  ctx.fillStyle = "#d8d8e0";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 11, y + TILE);
    ctx.lineTo(x + i * 11 + 5.5, y + TILE - 18);
    ctx.lineTo(x + i * 11 + 11, y + TILE);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCoin(ctx, x, y, time) {
  const wobble = Math.sin(time / 12 + x) * 0.5 + 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.5 + wobble * 0.5, 1);
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#e9c873";
  ctx.fill();
  ctx.strokeStyle = "#a8730f";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawFlag(ctx, x, y) {
  ctx.fillStyle = "#6b5840";
  ctx.fillRect(x + 14, y - TILE * 2, 4, TILE * 3);
  ctx.fillStyle = "#1f8a4c";
  ctx.beginPath();
  ctx.moveTo(x + 18, y - TILE * 2 + 4);
  ctx.lineTo(x + 44, y - TILE * 2 + 12);
  ctx.lineTo(x + 18, y - TILE * 2 + 20);
  ctx.closePath();
  ctx.fill();
}

function drawEnemy(ctx, x, y, dir, theme) {
  const palette = theme === "ember" ? { body: "#8a3a4a", dark: "#4a1a24" } : theme === "cliff" ? { body: "#6b5a8a", dark: "#3a2c4a" } : { body: "#9a5a3a", dark: "#5a3220" };
  ctx.save();
  ctx.translate(x + 13, y + 14);
  ctx.scale(dir, 1);
  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.dark;
  ctx.fillRect(-13, 8, 26, 6);
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(5, -2, 3.5, 0, 7); ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath(); ctx.arc(6.5, -2, 1.6, 0, 7); ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, p) {
  const blink = p.invuln > 0 && Math.floor(p.invuln / 6) % 2 === 0;
  if (blink) return;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  const bob = p.onGround ? Math.sin(p.anim) * 1.5 : 0;
  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.scale(p.facing, 1);

  // legs
  ctx.fillStyle = "#2a4a7a";
  const stride = p.onGround ? Math.sin(p.anim) * 5 : 3;
  ctx.fillRect(-8, 8 - bob, 6, 12 + stride * 0.3);
  ctx.fillRect(2, 8 - bob, 6, 12 - stride * 0.3);

  // body
  ctx.fillStyle = "#d9483c";
  ctx.beginPath();
  ctx.roundRect(-10, -8 - bob, 20, 18, 6);
  ctx.fill();

  // head
  ctx.fillStyle = "#f0c89a";
  ctx.beginPath();
  ctx.arc(2, -16 - bob, 9, 0, Math.PI * 2);
  ctx.fill();

  // cap
  ctx.fillStyle = "#1f5fa8";
  ctx.beginPath();
  ctx.arc(2, -18 - bob, 9.5, Math.PI, Math.PI * 1.85);
  ctx.fill();
  ctx.fillRect(-7, -22 - bob, 16, 5);
  ctx.fillRect(7, -19 - bob, 8, 4);

  // eye
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath(); ctx.arc(6, -16 - bob, 1.6, 0, 7); ctx.fill();

  ctx.restore();
}

// ═══════════════════════════════════════════════════════
//  OVERLAY
// ═══════════════════════════════════════════════════════
function Overlay({ title, sub, primaryLabel, onPrimary, secondaryLabel, onSecondary, tone }) {
  return (
    <div style={S.overlay}>
      <div style={S.overlayCard(tone)}>
        <div style={S.overlayTitle}>{title}</div>
        <div style={S.overlaySub}>{sub}</div>
        <div style={S.overlayBtns}>
          <button style={S.overlayBtnPrimary(tone)} onClick={onPrimary}>{primaryLabel}</button>
          <button style={S.overlayBtnSecondary} onClick={onSecondary}>{secondaryLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  LEVEL SELECT
// ═══════════════════════════════════════════════════════
function LevelSelect({ unlocked, onPick }) {
  return (
    <div style={S.menuPage}>
      <style>{CSS}</style>
      <div style={S.menuCard}>
        <div style={S.menuBadge}>Original side-scroller</div>
        <div style={S.menuTitle}>LEAP &amp; ROAM</div>
        <div style={S.menuSubtitle}>Run · Jump · Stomp · Reach the flag</div>

        <div style={S.levelGrid}>
          {LEVELS.map((lvl, i) => {
            const isUnlocked = i < unlocked;
            return (
              <button
                key={lvl.name}
                style={S.levelCard(lvl, isUnlocked)}
                onClick={() => isUnlocked && onPick(i)}
                disabled={!isUnlocked}
              >
                <div style={S.levelNum}>{i + 1}</div>
                <div style={S.levelName}>{lvl.name}</div>
                <div style={S.levelLock}>{isUnlocked ? "Ready" : "🔒 Locked"}</div>
              </button>
            );
          })}
        </div>

        <div style={S.menuHint}>Clear a level to unlock the next one</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #1a1420, #0d0a14)",
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 12, padding: 20,
    fontFamily: "'Iowan Old Style','Palatino Linotype','Georgia', serif",
  },
  hudBar: {
    width: 760, maxWidth: "100%",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, padding: "8px 14px",
  },
  hudBtn: {
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
    color: "#f0e6d2", borderRadius: 7, padding: "6px 12px", fontSize: 12.5,
    fontFamily: "inherit", cursor: "pointer",
  },
  hudTitle: { color: "#e9c873", fontWeight: 700, fontSize: 15, letterSpacing: "0.04em" },
  hudStats: { display: "flex", gap: 14, color: "#f0e6d2", fontSize: 14, fontWeight: 700 },
  canvasWrap: { position: "relative", width: 760, maxWidth: "100%" },
  canvas: {
    width: "100%", display: "block", borderRadius: 10,
    boxShadow: "0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
    background: "#000",
  },
  controlsHint: { color: "rgba(240,230,210,0.4)", fontSize: 12, textAlign: "center" },
  overlay: {
    position: "absolute", inset: 0,
    background: "rgba(10,6,12,0.78)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 10,
  },
  overlayCard: (tone) => ({
    background: "linear-gradient(160deg, #221a2c, #14101a)",
    border: `2px solid ${tone}`,
    borderRadius: 14, padding: "30px 36px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    boxShadow: `0 0 50px ${tone}44`,
    textAlign: "center",
  }),
  overlayTitle: { fontSize: 26, fontWeight: 900, color: "#f0e6d2" },
  overlaySub: { fontSize: 13, color: "rgba(240,230,210,0.55)" },
  overlayBtns: { display: "flex", gap: 10, marginTop: 8 },
  overlayBtnPrimary: (tone) => ({
    padding: "10px 22px", borderRadius: 8, border: "none",
    background: tone, color: "#fff", fontWeight: 700, fontSize: 13.5,
    fontFamily: "inherit", cursor: "pointer",
  }),
  overlayBtnSecondary: {
    padding: "10px 22px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.2)", background: "transparent",
    color: "rgba(240,230,210,0.7)", fontSize: 13.5, fontFamily: "inherit", cursor: "pointer",
  },
  menuPage: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 50% 0%, #2a1c3a 0%, #14101e 60%, #0a0810 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Iowan Old Style','Palatino Linotype','Georgia', serif",
    padding: 20,
  },
  menuCard: {
    background: "linear-gradient(160deg, rgba(255,245,225,0.06), rgba(255,245,225,0.02))",
    border: "1px solid rgba(201,160,74,0.25)",
    borderRadius: 18, padding: "44px 48px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
    boxShadow: "0 0 70px rgba(201,160,74,0.08), 0 40px 80px rgba(0,0,0,0.5)",
    maxWidth: 460, width: "100%", textAlign: "center",
  },
  menuBadge: { fontSize: 10, letterSpacing: "0.35em", color: "#9a7fd9", border: "1px solid #9a7fd955", borderRadius: 4, padding: "4px 14px", textTransform: "uppercase" },
  menuTitle: { fontSize: "clamp(34px,8vw,48px)", fontWeight: 700, color: "#e9c873", letterSpacing: "0.1em", textShadow: "0 1px 0 #00000090, 0 0 30px rgba(201,160,74,0.3)" },
  menuSubtitle: { fontSize: 13, color: "rgba(240,230,210,0.4)", letterSpacing: "0.1em" },
  levelGrid: { display: "flex", gap: 12, width: "100%", justifyContent: "center", flexWrap: "wrap" },
  levelCard: (lvl, unlocked) => ({
    width: 120, padding: "16px 10px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    borderRadius: 12,
    background: unlocked ? `linear-gradient(160deg, ${lvl.sky[0]}22, ${lvl.sky[1]}22)` : "rgba(255,255,255,0.03)",
    border: unlocked ? `1px solid ${lvl.hill}88` : "1px solid rgba(255,255,255,0.08)",
    cursor: unlocked ? "pointer" : "default",
    opacity: unlocked ? 1 : 0.5,
    fontFamily: "inherit",
    transition: "transform 0.15s, filter 0.15s",
  }),
  levelNum: { fontSize: 22, fontWeight: 900, color: "#e9c873" },
  levelName: { fontSize: 12.5, fontWeight: 700, color: "#f0e6d2" },
  levelLock: { fontSize: 10.5, color: "rgba(240,230,210,0.45)" },
  menuHint: { fontSize: 11, color: "rgba(240,230,210,0.3)" },
};

const CSS = `
  * { box-sizing: border-box; }
  .level-card:not(:disabled):hover { transform: translateY(-2px); filter: brightness(1.1); }
`;