import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════
//  LUDO — game logic (unchanged rules, original engine)
// ═══════════════════════════════════════════════════════

const COLORS = {
  red:    { primary: "#c8372f", light: "#ff7a6b", dark: "#7a1e19", gem: "#e8483c", home: "#f3d6cf" },
  green:  { primary: "#1f8a4c", light: "#5fe39a", dark: "#0e4f2a", gem: "#27a85c", home: "#cfeed9" },
  yellow: { primary: "#d99a1f", light: "#ffd76a", dark: "#7a5710", gem: "#e8ad2c", home: "#f6e6c2" },
  blue:   { primary: "#1f5fa8", light: "#6fb3ff", dark: "#0f3460", gem: "#2a72c4", home: "#cfe0f3" },
};
const PLAYER_COLORS = ["red", "green", "yellow", "blue"];

// Full 52-step path (board-relative [row,col])
const FULL_PATH = [
  [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],
  [4,6],[3,6],[2,6],[1,6],[0,6],[0,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],[8,14],[8,13],[8,12],[8,11],[8,10],
  [8,9],[9,8],[10,8],[11,8],[12,8],[13,8],
  [14,8],[14,7],[14,6],[13,6],[12,6],[11,6],
  [10,6],[9,6],[8,5],[8,4],[8,3],[8,2],
  [8,1],[8,0],[7,0],[6,0],
];

const HOME_COLS = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  green:  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  blue:   [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
};

const START_IDX = { red: 0, green: 13, yellow: 26, blue: 39 };

const HOME_CELLS = {
  red:    [[1,1],[1,3],[3,1],[3,3]],
  green:  [[1,11],[1,13],[3,11],[3,13]],
  yellow: [[11,11],[11,13],[13,11],[13,13]],
  blue:   [[11,1],[11,3],[13,1],[13,3]],
};

const SAFE_CELLS_RC = new Set([
  "6,1","8,2","6,12","2,8","8,12","12,8","6,2",
  "1,6","12,6","8,13",
  "0,6","6,14","14,8","8,0",
]);

function cellKey(r, c) { return `${r},${c}`; }

function initPieces() {
  const pieces = {};
  PLAYER_COLORS.forEach(color => {
    pieces[color] = [0,1,2,3].map(id => ({ id, pos: -1, color, finished: false }));
  });
  return pieces;
}

function getCell(color, pos) {
  if (pos === -1) return null;
  if (pos >= 52) {
    const idx = pos - 52;
    return HOME_COLS[color][idx] || null;
  }
  const startIdx = START_IDX[color];
  const globalIdx = (startIdx + pos) % 52;
  return FULL_PATH[globalIdx] || null;
}

function isSafe(color, pos) {
  if (pos <= 0) return true;
  const cell = getCell(color, pos);
  if (!cell) return false;
  if (SAFE_CELLS_RC.has(cellKey(cell[0], cell[1]))) return true;
  return false;
}

function rollDice() { return Math.floor(Math.random() * 6) + 1; }

const DIE_DOTS = {
  1: [[50,50]],
  2: [[25,25],[75,75]],
  3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
};

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ═══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function Ludo() {
  const [pieces, setPieces]         = useState(initPieces);
  const [turn, setTurn]             = useState(0);
  const [dice, setDice]             = useState(null);
  const [rolling, setRolling]       = useState(false);
  const [movable, setMovable]       = useState([]);
  const [message, setMessage]       = useState("Red rolls first!");
  const [winner, setWinner]         = useState(null);
  const [animPiece, setAnimPiece]   = useState(null);
  const [scores, setScores]         = useState({ red: 0, green: 0, yellow: 0, blue: 0 });
  const [numPlayers, setNumPlayers] = useState(4);
  const [started, setStarted]       = useState(false);

  const currentColor = PLAYER_COLORS[turn % numPlayers];

  const findMovable = useCallback((color, diceVal, piecesState) => {
    const ps = piecesState[color];
    return ps.filter(p => {
      if (p.finished) return false;
      if (p.pos === -1) return diceVal === 6;
      const newPos = p.pos + diceVal;
      if (newPos > 57) return false;
      return true;
    }).map(p => p.id);
  }, []);

  const handleRoll = () => {
    if (rolling || dice !== null || winner) return;
    setRolling(true);
    let ticks = 0;
    const anim = setInterval(() => {
      setDice(rollDice());
      ticks++;
      if (ticks > 10) {
        clearInterval(anim);
        const finalVal = rollDice();
        setDice(finalVal);
        setRolling(false);

        const mv = findMovable(currentColor, finalVal, pieces);
        if (mv.length === 0) {
          setMessage(`${cap(currentColor)}: no moves — turn passes.`);
          setTimeout(() => nextTurn(finalVal === 6), 1100);
        } else {
          setMovable(mv);
          setMessage(finalVal === 6
            ? `${cap(currentColor)} rolled 6 — pick a piece.`
            : `${cap(currentColor)} rolled ${finalVal} — pick a piece.`);
        }
      }
    }, 60);
  };

  const handleMove = useCallback((color, pieceId) => {
    if (!movable.includes(pieceId) || color !== currentColor) return;
    const diceVal = dice;
    let captureHappened = false;

    setPieces(prev => {
      const next = { ...prev, [color]: prev[color].map(p => {
        if (p.id !== pieceId) return p;
        let newPos = p.pos === -1 ? 0 : p.pos + diceVal;
        if (newPos >= 57) newPos = 57;
        return { ...p, pos: newPos, finished: newPos === 57 };
      }) };

      const movedPiece = next[color].find(p => p.id === pieceId);
      const movedCell = getCell(color, movedPiece.pos);

      if (movedPiece.pos >= 0 && movedPiece.pos < 52 && movedCell) {
        const ck = cellKey(movedCell[0], movedCell[1]);
        if (!isSafe(color, movedPiece.pos)) {
          PLAYER_COLORS.forEach(oc => {
            if (oc === color) return;
            next[oc] = next[oc].map(op => {
              if (op.finished || op.pos < 0 || op.pos >= 52) return op;
              const oc2 = getCell(oc, op.pos);
              if (oc2 && cellKey(oc2[0], oc2[1]) === ck) {
                captureHappened = true;
                return { ...op, pos: -1 };
              }
              return op;
            });
          });
        }
      }

      if (next[color].every(p => p.finished)) {
        setWinner(color);
        setScores(s => ({ ...s, [color]: s[color] + 1 }));
      }

      return next;
    });

    if (captureHappened) setMessage(`${cap(color)} sent a piece home! 🎯`);

    setAnimPiece(`${color}-${pieceId}`);
    setTimeout(() => setAnimPiece(null), 500);

    setMovable([]);
    const extraTurn = diceVal === 6;
    setDice(null);
    setTimeout(() => nextTurn(extraTurn), 600);
  }, [movable, currentColor, dice]);

  function nextTurn(extraTurn) {
    setWinner(w => {
      if (w) return w;
      if (extraTurn) {
        setMessage(`${cap(currentColor)} rolls again!`);
      } else {
        setTurn(t => {
          const next = (t + 1) % numPlayers;
          setMessage(`${cap(PLAYER_COLORS[next])} rolls!`);
          return next;
        });
      }
      setDice(null);
      setMovable([]);
      return w;
    });
  }

  function resetGame() {
    setPieces(initPieces());
    setTurn(0);
    setDice(null);
    setMovable([]);
    setMessage("Red rolls first!");
    setWinner(null);
    setAnimPiece(null);
  }

  const cellMap = {};
  PLAYER_COLORS.slice(0, numPlayers).forEach(color => {
    pieces[color].forEach(p => {
      if (p.pos === -1) return;
      const cell = getCell(color, p.pos);
      if (!cell) return;
      const k = cellKey(cell[0], cell[1]);
      if (!cellMap[k]) cellMap[k] = [];
      cellMap[k].push({ color, id: p.id, pos: p.pos });
    });
  });

  if (!started) {
    return <TitleScreen onStart={(n) => { setNumPlayers(n); setStarted(true); }} scores={scores} />;
  }

  return (
    <div style={gs.page}>
      <style>{css}</style>
      <div style={gs.layout}>
        <div style={gs.sidePanel}>
          <div style={gs.crest}>
            <div style={gs.crestLine} />
            <div style={gs.gameTitle}>LUDO</div>
            <div style={gs.crestLine} />
          </div>

          <div style={gs.turnBadge(COLORS[currentColor])}>
            <div style={gs.turnGem(COLORS[currentColor])} />
            <span>{cap(currentColor)}&rsquo;s Turn</span>
          </div>

          <div style={gs.diceSection}>
            <DiceDisplay value={dice} rolling={rolling} color={COLORS[currentColor]} />
            <button
              style={gs.rollBtn(COLORS[currentColor], !!dice || rolling || !!winner)}
              onClick={handleRoll}
              disabled={!!dice || rolling || !!winner}
              className="roll-btn"
            >
              {rolling ? "Rolling…" : dice ? "Choose a piece" : "Roll Dice"}
            </button>
          </div>

          <div style={gs.message}>{message}</div>

          <div style={gs.playerList}>
            {PLAYER_COLORS.slice(0, numPlayers).map((color, i) => {
              const ps = pieces[color];
              const finished = ps.filter(p => p.finished).length;
              const onBoard = ps.filter(p => p.pos >= 0 && !p.finished).length;
              const inBase = ps.filter(p => p.pos === -1).length;
              const isActive = i === turn % numPlayers;
              return (
                <div key={color} style={gs.playerRow(COLORS[color], isActive)}>
                  <Gem color={COLORS[color]} size={16} />
                  <div style={gs.playerInfo}>
                    <div style={gs.playerName(isActive)}>{cap(color)}</div>
                    <div style={gs.playerStats}>
                      <span title="In base">⌂ {inBase}</span>
                      <span title="On board">◆ {onBoard}</span>
                      <span title="Home">✓ {finished}</span>
                    </div>
                  </div>
                  <div style={gs.playerScore}>{scores[color]}</div>
                </div>
              );
            })}
          </div>

          <div style={gs.btnRow}>
            <button style={gs.smallBtn} onClick={resetGame} className="small-btn">↺ Restart</button>
            <button style={gs.smallBtn} onClick={() => setStarted(false)} className="small-btn">⌂ Menu</button>
          </div>
        </div>

        <div style={gs.boardFrame}>
          <Board
            pieces={pieces}
            numPlayers={numPlayers}
            movable={movable}
            currentColor={currentColor}
            onMove={handleMove}
            cellMap={cellMap}
            animPiece={animPiece}
          />
        </div>
      </div>

      {winner && (
        <div style={gs.modal}>
          <div style={gs.modalCard(COLORS[winner])}>
            <Gem color={COLORS[winner]} size={56} />
            <div style={gs.modalTitle}>{cap(winner)} Wins!</div>
            <div style={gs.modalSub}>A clean sweep around the board.</div>
            <button style={gs.modalBtn(COLORS[winner])} onClick={resetGame} className="roll-btn">Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  BOARD
// ═══════════════════════════════════════════════════════
const CELL_SIZE = 42;
const BOARD_SIZE = 15 * CELL_SIZE;

function Board({ pieces, numPlayers, movable, currentColor, onMove, cellMap, animPiece }) {
  const grid = Array.from({ length: 15 }, (_, r) =>
    Array.from({ length: 15 }, (_, c) => getCellType(r, c))
  );

  return (
    <div style={gs.boardInner}>
      {grid.map((row, r) =>
        row.map((type, c) => {
          const k = cellKey(r, c);
          const occupants = cellMap[k] || [];
          const isStar = SAFE_CELLS_RC.has(k);
          const isArrow = isArrowCell(r, c);
          return (
            <BoardCell
              key={k}
              r={r} c={c}
              type={type}
              occupants={occupants}
              isStar={isStar}
              isArrow={isArrow}
              movable={movable}
              currentColor={currentColor}
              onMove={onMove}
              animPiece={animPiece}
            />
          );
        })
      )}

      {PLAYER_COLORS.slice(0, numPlayers).map(color =>
        pieces[color].filter(p => p.pos === -1).map((p, idx) => {
          const [hr, hc] = HOME_CELLS[color][idx] || HOME_CELLS[color][0];
          const canMove = movable.includes(p.id) && color === currentColor;
          const animKey = `${color}-${p.id}`;
          return (
            <div
              key={`home-${color}-${p.id}`}
              style={{
                position: "absolute",
                left: hc * CELL_SIZE + CELL_SIZE / 2 - 14,
                top: hr * CELL_SIZE + CELL_SIZE / 2 - 14,
                cursor: canMove ? "pointer" : "default",
                zIndex: 10,
              }}
              className={canMove ? "piece-pulse" : animKey === animPiece ? "piece-jump" : ""}
              onClick={() => canMove && onMove(color, p.id)}
            >
              <Gem color={COLORS[color]} size={28} highlight={canMove} />
            </div>
          );
        })
      )}
    </div>
  );
}

function BoardCell({ r, c, type, occupants, isStar, isArrow, movable, currentColor, onMove, animPiece }) {
  const bg = getCellBg(r, c, type);
  const x = c * CELL_SIZE, y = r * CELL_SIZE;
  const isQuadEdge = (type.startsWith("home-") || type === "center") ;

  return (
    <div style={{
      position: "absolute",
      left: x, top: y,
      width: CELL_SIZE, height: CELL_SIZE,
      background: bg,
      borderRight: "1px solid rgba(60,40,20,0.18)",
      borderBottom: "1px solid rgba(60,40,20,0.18)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexWrap: "wrap", gap: 1,
      overflow: "hidden",
      boxShadow: isQuadEdge ? "none" : "inset 0 0 0 1px rgba(255,255,255,0.06)",
    }}>
      {isStar && occupants.length === 0 && type === "path" && (
        <div style={{ fontSize: 15, opacity: 0.55, color: "#5a4424", userSelect: "none" }}>★</div>
      )}
      {isArrow && occupants.length === 0 && (
        <div style={{ fontSize: 13, opacity: 0.5, color: "#fff8e8", fontWeight: 700 }}>{getArrow(r, c)}</div>
      )}

      {occupants.map((occ, i) => {
        const canMove = movable.includes(occ.id) && occ.color === currentColor;
        const animKey = `${occ.color}-${occ.id}`;
        const small = occupants.length > 2;
        return (
          <div
            key={`${occ.color}-${occ.id}`}
            style={{ cursor: canMove ? "pointer" : "default", zIndex: 10 }}
            className={canMove ? "piece-pulse" : animKey === animPiece ? "piece-jump" : ""}
            onClick={() => canMove && onMove(occ.color, occ.id)}
            title={canMove ? `Move ${occ.color} piece` : ""}
          >
            <Gem color={COLORS[occ.color]} size={small ? 13 : 19} highlight={canMove} />
          </div>
        );
      })}
    </div>
  );
}

// A faceted "gem" piece — radial highlight + cut-glass facet lines + grounded shadow
function Gem({ color, size, highlight }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" style={{ display: "block", overflow: "visible" }}>
      <ellipse cx="50" cy="88" rx="30" ry="7" fill="rgba(20,10,0,0.35)" />
      {highlight && (
        <circle cx="50" cy="50" r="46" fill="none" stroke={color.light} strokeWidth="5" opacity="0.85">
          <animate attributeName="r" values="40;47;40" dur="1.1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.1s" repeatCount="indefinite" />
        </circle>
      )}
      <polygon points="50,6 88,38 74,90 26,90 12,38" fill={color.dark} />
      <polygon points="50,6 88,38 50,52" fill={color.gem} />
      <polygon points="50,6 12,38 50,52" fill={color.primary} />
      <polygon points="12,38 26,90 50,52" fill={color.dark} opacity="0.92" />
      <polygon points="88,38 74,90 50,52" fill={color.primary} opacity="0.85" />
      <polygon points="26,90 74,90 50,52" fill={color.dark} />
      <polygon points="50,6 64,24 50,30 36,24" fill={color.light} opacity="0.9" />
      <circle cx="42" cy="22" r="5" fill="#fff" opacity="0.55" />
    </svg>
  );
}

function getCellType(r, c) {
  if (r < 6 && c < 6) return "home-red";
  if (r < 6 && c > 8) return "home-green";
  if (r > 8 && c > 8) return "home-yellow";
  if (r > 8 && c < 6) return "home-blue";
  if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
    if (r === 7 && c === 7) return "center";
    return "center-path";
  }
  return "path";
}

function getCellBg(r, c, type) {
  if (type === "center") return "radial-gradient(circle at 35% 30%, #ffe9a8, #d99a1f 70%, #a8730f)";
  if (type === "center-path") {
    if (c === 7 && r < 7) return COLORS.green.home;
    if (c === 7 && r > 7) return COLORS.blue.home;
    if (r === 7 && c < 7) return COLORS.red.home;
    if (r === 7 && c > 7) return COLORS.yellow.home;
    return "#e9e2cd";
  }
  if (type === "home-red")    return isInsideHome(r,c,1,1,4,4)   ? COLORS.red.home    : "#efe7d2";
  if (type === "home-green")  return isInsideHome(r,c,1,9,4,12)  ? COLORS.green.home  : "#efe7d2";
  if (type === "home-yellow") return isInsideHome(r,c,9,9,12,12) ? COLORS.yellow.home : "#efe7d2";
  if (type === "home-blue")   return isInsideHome(r,c,9,1,12,4)  ? COLORS.blue.home   : "#efe7d2";

  if (r === 7) {
    if (c >= 1 && c <= 5) return COLORS.red.primary;
    if (c >= 9 && c <= 13) return COLORS.yellow.primary;
  }
  if (c === 7) {
    if (r >= 1 && r <= 5) return COLORS.green.primary;
    if (r >= 9 && r <= 13) return COLORS.blue.primary;
  }
  if (r === 6 && c === 1) return COLORS.red.primary + "70";
  if (r === 1 && c === 6) return COLORS.green.primary + "70";
  if (r === 8 && c === 13) return COLORS.yellow.primary + "70";
  if (r === 13 && c === 8) return COLORS.blue.primary + "70";

  return "#ece2c8";
}

function isInsideHome(r, c, r1, c1, r2, c2) {
  return r >= r1 && r <= r2 && c >= c1 && c <= c2;
}

function isArrowCell(r, c) {
  return (r === 7 && (c === 1 || c === 13)) || (c === 7 && (r === 1 || r === 13));
}

function getArrow(r, c) {
  if (r === 7 && c === 1) return "→";
  if (r === 7 && c === 13) return "←";
  if (c === 7 && r === 1) return "↓";
  if (c === 7 && r === 13) return "↑";
  return "";
}

// ═══════════════════════════════════════════════════════
//  DICE
// ═══════════════════════════════════════════════════════
function DiceDisplay({ value, rolling, color }) {
  return (
    <div
      style={gs.dice(color)}
      className={rolling ? "dice-roll" : value ? "dice-land" : ""}
    >
      {value ? (
        <svg width="50" height="50" viewBox="0 0 100 100">
          {DIE_DOTS[value].map(([dx, dy], i) => (
            <circle key={i} cx={dx} cy={dy} r={8.5} fill={color.primary} />
          ))}
        </svg>
      ) : (
        <div style={{ fontSize: 26, opacity: 0.18, fontFamily: "Georgia, serif" }}>?</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  TITLE SCREEN
// ═══════════════════════════════════════════════════════
function TitleScreen({ onStart, scores }) {
  const [players, setPlayers] = useState(4);
  return (
    <div style={ts.page}>
      <style>{css}</style>
      <div style={ts.card}>
        <div style={ts.badge}>Classic Board Game</div>
        <div style={ts.title}>LUDO</div>
        <div style={ts.subtitle}>Roll · Move · Conquer</div>

        <div style={ts.colorRow}>
          {PLAYER_COLORS.map(c => <Gem key={c} color={COLORS[c]} size={26} />)}
        </div>

        <div style={ts.section}>
          <div style={ts.label}>Number of Players</div>
          <div style={ts.playerBtns}>
            {[2, 3, 4].map(n => (
              <button
                key={n}
                style={{ ...ts.playerBtn, ...(players === n ? ts.playerBtnActive : {}) }}
                onClick={() => setPlayers(n)}
              >{n} Players</button>
            ))}
          </div>
        </div>

        <div style={ts.section}>
          <div style={ts.label}>Win Record</div>
          <div style={ts.scoreRow}>
            {PLAYER_COLORS.slice(0, players).map(c => (
              <div key={c} style={ts.scoreItem}>
                <Gem color={COLORS[c]} size={15} />
                <span style={{ color: COLORS[c].primary, fontWeight: 700 }}>{scores[c]}</span>
              </div>
            ))}
          </div>
        </div>

        <button style={ts.startBtn} onClick={() => onStart(players)} className="roll-btn">
          ▶ Start Game
        </button>

        <div style={ts.rules}>
          Roll a 6 to leave base · land on a rival to send them home · bring all four pieces home to win
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════
const gs = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 50% 0%, #2a1c12 0%, #1a120a 60%, #100b06 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20,
    fontFamily: "'Iowan Old Style','Palatino Linotype','Georgia', serif",
  },
  layout: {
    display: "flex", gap: 26, alignItems: "flex-start",
    flexWrap: "wrap", justifyContent: "center",
  },
  sidePanel: {
    width: 230,
    display: "flex", flexDirection: "column", gap: 14,
    background: "linear-gradient(160deg, rgba(255,245,225,0.06), rgba(255,245,225,0.02))",
    border: "1px solid rgba(201,160,74,0.25)",
    borderRadius: 14,
    padding: 20,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  },
  crest: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  crestLine: { width: 60, height: 1, background: "linear-gradient(90deg, transparent, #c9a04a, transparent)" },
  gameTitle: {
    fontSize: 30, fontWeight: 700, letterSpacing: "0.35em",
    color: "#e9c873",
    textShadow: "0 1px 0 #00000080, 0 0 18px rgba(201,160,74,0.35)",
    textAlign: "center",
  },
  turnBadge: (c) => ({
    display: "flex", alignItems: "center", gap: 9,
    background: `linear-gradient(135deg, ${c.primary}22, transparent)`,
    border: `1px solid ${c.primary}55`,
    borderRadius: 9,
    padding: "9px 12px",
    color: c.light,
    fontWeight: 700,
    fontSize: 14,
  }),
  turnGem: (c) => ({
    width: 11, height: 11, borderRadius: "50%",
    background: `radial-gradient(circle at 35% 30%, ${c.light}, ${c.primary})`,
    boxShadow: `0 0 8px ${c.primary}`,
    flexShrink: 0,
    animation: "dotPulse 1.2s ease-in-out infinite",
  }),
  diceSection: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  dice: (c) => ({
    width: 70, height: 70,
    background: "linear-gradient(160deg, #fffdf6, #f1e8d2)",
    borderRadius: 13,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: `0 8px 18px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.9)`,
    border: `2px solid ${c.primary}99`,
    flexShrink: 0,
  }),
  rollBtn: (c, disabled) => ({
    width: "100%",
    padding: "10px 0",
    background: disabled
      ? "rgba(255,255,255,0.05)"
      : `linear-gradient(135deg, ${c.light}, ${c.primary})`,
    color: disabled ? "#776a55" : "#fff7e6",
    border: "none",
    borderRadius: 9,
    fontSize: 14, fontWeight: 700,
    fontFamily: "inherit",
    cursor: disabled ? "default" : "pointer",
    letterSpacing: "0.04em",
    boxShadow: disabled ? "none" : `0 4px 0 rgba(0,0,0,0.4), 0 0 18px ${c.primary}55`,
    transition: "filter 0.15s, transform 0.15s",
  }),
  message: {
    fontSize: 12.5, color: "rgba(255,245,225,0.7)",
    textAlign: "center", lineHeight: 1.5,
    minHeight: 36,
    background: "rgba(0,0,0,0.18)",
    borderRadius: 8, padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  playerList: { display: "flex", flexDirection: "column", gap: 6 },
  playerRow: (c, active) => ({
    display: "flex", alignItems: "center", gap: 9,
    padding: "7px 10px",
    borderRadius: 8,
    background: active ? `${c.primary}1f` : "rgba(255,255,255,0.02)",
    border: `1px solid ${active ? c.primary + "55" : "rgba(255,255,255,0.05)"}`,
    transition: "all 0.3s",
  }),
  playerInfo: { flex: 1 },
  playerName: (active) => ({
    fontSize: 13, fontWeight: 700,
    color: active ? "#fff7e6" : "rgba(255,245,225,0.45)",
  }),
  playerStats: {
    fontSize: 10, color: "rgba(255,245,225,0.32)", marginTop: 1,
    display: "flex", gap: 7,
  },
  playerScore: { fontSize: 16, fontWeight: 900, color: "#e9c873" },
  btnRow: { display: "flex", gap: 8 },
  smallBtn: {
    flex: 1, padding: "8px 0",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8, color: "rgba(255,245,225,0.55)",
    fontSize: 12, fontFamily: "inherit",
    cursor: "pointer",
  },
  boardFrame: {
    borderRadius: 14,
    padding: 10,
    background: "linear-gradient(155deg, #4a3018, #2c1b0c)",
    border: "1px solid rgba(201,160,74,0.3)",
    boxShadow: "0 25px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
    position: "relative",
  },
  boardInner: {
    position: "relative",
    width: BOARD_SIZE, height: BOARD_SIZE,
    borderRadius: 6, overflow: "hidden",
    boxShadow: "0 0 0 3px #1c1208, 0 0 0 4px rgba(201,160,74,0.4)",
  },
  modal: {
    position: "fixed", inset: 0,
    background: "rgba(10,6,3,0.82)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100,
  },
  modalCard: (c) => ({
    background: "linear-gradient(160deg, #2a1c12, #15100a)",
    border: `2px solid ${c.primary}`,
    borderRadius: 18,
    padding: "44px 52px",
    textAlign: "center",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
    boxShadow: `0 0 70px ${c.primary}44`,
  }),
  modalTitle: { fontSize: 38, fontWeight: 900, color: "#e9c873", letterSpacing: "0.06em", textShadow: "0 0 24px rgba(201,160,74,0.4)" },
  modalSub: { fontSize: 15, color: "rgba(255,245,225,0.5)" },
  modalBtn: (c) => ({
    padding: "13px 40px",
    background: `linear-gradient(135deg, ${c.light}, ${c.primary})`,
    color: "#fff7e6", border: "none", borderRadius: 9,
    fontSize: 17, fontWeight: 700, fontFamily: "inherit",
    cursor: "pointer",
    boxShadow: `0 4px 0 rgba(0,0,0,0.4), 0 0 26px ${c.primary}44`,
  }),
};

const ts = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 50% 0%, #2a1c12 0%, #1a120a 60%, #100b06 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Iowan Old Style','Palatino Linotype','Georgia', serif",
    padding: 20,
  },
  card: {
    background: "linear-gradient(160deg, rgba(255,245,225,0.06), rgba(255,245,225,0.02))",
    border: "1px solid rgba(201,160,74,0.25)",
    borderRadius: 18,
    padding: "46px 50px",
    textAlign: "center",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
    boxShadow: "0 0 70px rgba(201,160,74,0.08), 0 40px 80px rgba(0,0,0,0.5)",
    maxWidth: 420, width: "100%",
  },
  badge: { fontSize: 10, letterSpacing: "0.4em", color: "#d99a1f", border: "1px solid #d99a1f55", borderRadius: 4, padding: "4px 14px", textTransform: "uppercase" },
  title: {
    fontSize: "clamp(54px,13vw,88px)", fontWeight: 700,
    color: "#e9c873",
    letterSpacing: "0.35em",
    textShadow: "0 1px 0 #00000090, 0 0 30px rgba(201,160,74,0.35)",
    lineHeight: 1,
  },
  subtitle: { fontSize: 13, color: "rgba(255,245,225,0.4)", letterSpacing: "0.25em" },
  colorRow: { display: "flex", gap: 14, alignItems: "center" },
  section: { width: "100%", display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 11, color: "rgba(255,245,225,0.35)", letterSpacing: "0.2em", textTransform: "uppercase" },
  playerBtns: { display: "flex", gap: 8, justifyContent: "center" },
  playerBtn: {
    padding: "8px 20px", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8, background: "rgba(255,255,255,0.04)",
    color: "rgba(255,245,225,0.5)", fontSize: 13,
    fontFamily: "inherit", cursor: "pointer",
  },
  playerBtnActive: {
    background: "rgba(201,160,74,0.18)",
    border: "1px solid rgba(201,160,74,0.5)",
    color: "#e9c873",
  },
  scoreRow: { display: "flex", gap: 16, justifyContent: "center" },
  scoreItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 16 },
  startBtn: {
    padding: "14px 54px",
    background: "linear-gradient(135deg, #e9c873, #c9a04a)",
    color: "#241608", border: "none", borderRadius: 10,
    fontSize: 17, fontWeight: 900, fontFamily: "inherit",
    cursor: "pointer", letterSpacing: "0.06em",
    boxShadow: "0 4px 0 #7a5710, 0 0 30px rgba(201,160,74,0.35)",
  },
  rules: { fontSize: 11, color: "rgba(255,245,225,0.3)", lineHeight: 1.7, maxWidth: 300 },
};

const css = `
  * { box-sizing: border-box; }
  body { background: #100b06; }

  @keyframes diceRoll {
    0%   { transform: rotate(0deg) scale(1); }
    25%  { transform: rotate(90deg) scale(0.9); }
    50%  { transform: rotate(180deg) scale(1.1); }
    75%  { transform: rotate(270deg) scale(0.9); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes diceLand {
    0%   { transform: scale(1.3); }
    60%  { transform: scale(0.9); }
    100% { transform: scale(1); }
  }
  @keyframes piecePulse {
    0%,100% { transform: scale(1) translateY(0); }
    50%     { transform: scale(1.12) translateY(-2px); }
  }
  @keyframes pieceJump {
    0%   { transform: scale(1) translateY(0); }
    40%  { transform: scale(1.25) translateY(-10px); }
    100% { transform: scale(1) translateY(0); }
  }
  @keyframes dotPulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%     { opacity: 0.5; transform: scale(0.75); }
  }
  @keyframes rollBtnPulse {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-2px); }
  }

  .dice-roll   { animation: diceRoll 0.1s linear infinite; }
  .dice-land   { animation: diceLand 0.3s ease-out; }
  .piece-pulse { animation: piecePulse 0.7s ease-in-out infinite; }
  .piece-jump  { animation: pieceJump 0.5s ease-out; }
  .roll-btn:not(:disabled):hover  { filter: brightness(1.12); transform: translateY(-1px); }
  .roll-btn:not(:disabled):active { transform: translateY(2px); }
  .roll-btn:not(:disabled)        { animation: rollBtnPulse 1.6s ease-in-out infinite; }
  .small-btn:hover { background: rgba(255,255,255,0.1) !important; color: rgba(255,245,225,0.8) !important; }
`;