import React, { useState, useRef, useCallback, useMemo } from "react";

// ---------- Board configuration ----------
const SIZE = 10; // 10x10 board, 100 squares
const CELL = 60;
const BOARD_PX = CELL * SIZE;

// classic-style snake and ladder placements (head/bottom -> tail/top are higher->lower for snakes, low->high for ladders)
const LADDERS = {
  4: 25,
  13: 46,
  33: 49,
  42: 63,
  50: 69,
  62: 81,
  74: 92,
};
const SNAKES = {
  27: 5,
  40: 3,
  43: 18,
  54: 31,
  64: 60,
  87: 24,
  93: 73,
  99: 78,
};

const PLAYER_COLORS = [
  { name: "Coral", main: "#c1442e", light: "#e0735a" },
  { name: "Teal", main: "#1f6f5c", light: "#4fa28d" },
  { name: "Gold", main: "#b8860b", light: "#dcae3f" },
  { name: "Plum", main: "#6a3b6e", light: "#9a6a9e" },
];

// convert square number (1-100) to row/col on the boustrophedon board
function squareToRowCol(n) {
  const idx = n - 1;
  const row = Math.floor(idx / SIZE); // 0 = bottom row
  let col = idx % SIZE;
  if (row % 2 === 1) col = SIZE - 1 - col; // alternate direction
  return { row, col };
}

function squareToXY(n) {
  const { row, col } = squareToRowCol(n);
  const x = col * CELL + CELL / 2;
  const y = BOARD_PX - row * CELL - CELL / 2;
  return { x, y };
}

// ---------- Component ----------
export default function SnakeLadderGame() {
  const [numPlayers, setNumPlayers] = useState(2);
  const [started, setStarted] = useState(false);
  const [positions, setPositions] = useState(Array(4).fill(1));
  const [renderPositions, setRenderPositions] = useState(Array(4).fill(1));
  const [current, setCurrent] = useState(0);
  const [dice, setDice] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [winner, setWinner] = useState(null);
  const [message, setMessage] = useState("Roll to begin!");
  const animTimeoutRef = useRef(null);

  const startGame = (n) => {
    setNumPlayers(n);
    setPositions(Array(4).fill(1));
    setRenderPositions(Array(4).fill(1));
    setCurrent(0);
    setWinner(null);
    setMessage(`${PLAYER_COLORS[0].name}'s turn — roll the dice`);
    setStarted(true);
  };

  const resetGame = () => {
    setStarted(false);
    setWinner(null);
  };

  const animateStep = useCallback((playerIdx, from, to, onDone) => {
    // animate moving one square at a time from 'from' to 'to'
    let pos = from;
    const step = () => {
      if (pos >= to) {
        onDone();
        return;
      }
      pos += 1;
      setRenderPositions((prev) => {
        const next = [...prev];
        next[playerIdx] = pos;
        return next;
      });
      animTimeoutRef.current = setTimeout(step, 140);
    };
    step();
  }, []);

  const rollDice = () => {
    if (rolling || moving || winner) return;
    setRolling(true);

    let rollCount = 0;
    const rollInterval = setInterval(() => {
      setDice(1 + Math.floor(Math.random() * 6));
      rollCount++;
      if (rollCount >= 8) {
        clearInterval(rollInterval);
        const finalRoll = 1 + Math.floor(Math.random() * 6);
        setDice(finalRoll);
        setRolling(false);
        handleMove(finalRoll);
      }
    }, 80);
  };

  const handleMove = (roll) => {
    setMoving(true);
    const playerIdx = current;
    const startPos = positions[playerIdx];
    let target = startPos + roll;

    if (target > 100) {
      // can't move, overshoot
      setMessage(`${PLAYER_COLORS[playerIdx].name} rolled ${roll} — needs exact count, turn passes`);
      setTimeout(() => {
        setMoving(false);
        nextTurn();
      }, 900);
      return;
    }

    setMessage(`${PLAYER_COLORS[playerIdx].name} rolled ${roll}`);

    animateStep(playerIdx, startPos, target, () => {
      // check ladder/snake at landing square
      let finalPos = target;
      let eventMsg = null;
      if (LADDERS[target]) {
        finalPos = LADDERS[target];
        eventMsg = "climbed a ladder!";
      } else if (SNAKES[target]) {
        finalPos = SNAKES[target];
        eventMsg = "bitten by a snake!";
      }

      setPositions((prev) => {
        const next = [...prev];
        next[playerIdx] = finalPos;
        return next;
      });

      if (eventMsg) {
        setTimeout(() => {
          setMessage(`${PLAYER_COLORS[playerIdx].name} ${eventMsg}`);
          // slide render position to final (ladder/snake destination) after a brief pause
          setTimeout(() => {
            setRenderPositions((prev) => {
              const next = [...prev];
              next[playerIdx] = finalPos;
              return next;
            });
            finishTurn(playerIdx, finalPos);
          }, 500);
        }, 200);
      } else {
        finishTurn(playerIdx, finalPos);
      }
    });
  };

  const finishTurn = (playerIdx, finalPos) => {
    setTimeout(() => {
      setMoving(false);
      if (finalPos === 100) {
        setWinner(playerIdx);
        setMessage(`${PLAYER_COLORS[playerIdx].name} wins! 🎉`);
      } else {
        nextTurn();
      }
    }, 400);
  };

  const nextTurn = () => {
    setCurrent((prev) => {
      const next = (prev + 1) % numPlayers;
      setMessage(`${PLAYER_COLORS[next].name}'s turn — roll the dice`);
      return next;
    });
  };

  // ---------- SVG path generators for snakes & ladders ----------
  const ladderPaths = useMemo(() => {
    return Object.entries(LADDERS).map(([from, to]) => {
      const a = squareToXY(Number(from));
      const b = squareToXY(Number(to));
      return { from: Number(from), to: Number(to), a, b };
    });
  }, []);

  const snakePaths = useMemo(() => {
    return Object.entries(SNAKES).map(([from, to]) => {
      const a = squareToXY(Number(from));
      const b = squareToXY(Number(to));
      // generate a wavy curve between a (head, higher number) and b (tail, lower)
      const segs = 4;
      const points = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const x = a.x + (b.x - a.x) * t + Math.sin(t * Math.PI * 2.2) * 28 * (1 - t * 0.3);
        const y = a.y + (b.y - a.y) * t;
        points.push({ x, y });
      }
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const mx = (p0.x + p1.x) / 2;
        const my = (p0.y + p1.y) / 2;
        d += ` Q ${p0.x} ${p0.y}, ${mx} ${my}`;
      }
      d += ` T ${points[points.length - 1].x} ${points[points.length - 1].y}`;
      return { from: Number(from), to: Number(to), a, b, d, points };
    });
  }, []);

  if (!started) {
    return <StartScreen onStart={startGame} />;
  }

  return (
    <div
      style={{
        minHeight: "100%",
        background: "radial-gradient(circle at 30% 20%, #1c4d3c, #0d3b2e 60%, #07241b)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px 16px",
        fontFamily: "Georgia, 'Palatino Linotype', serif",
      }}
    >
      <h1
        style={{
          color: "#f4ecd8",
          fontSize: 32,
          letterSpacing: 3,
          margin: "0 0 4px",
          textShadow: "0 2px 6px rgba(0,0,0,0.4)",
        }}
      >
        Snakes &amp; Ladders
      </h1>
      <div
        style={{
          color: "#d4a017",
          fontSize: 13,
          letterSpacing: 2,
          marginBottom: 20,
          fontFamily: "system-ui, sans-serif",
          fontWeight: 600,
        }}
      >
        FIRST TO SQUARE 100 WINS
      </div>

      <div
        style={{
          display: "flex",
          gap: 28,
          alignItems: "flex-start",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {/* Board */}
        <div
          style={{
            position: "relative",
            width: BOARD_PX + 16,
            padding: 8,
            background: "linear-gradient(135deg, #5a3a1e, #3d2613)",
            borderRadius: 10,
            boxShadow: "0 16px 40px rgba(0,0,0,0.5), inset 0 0 0 2px #2a1a0d",
          }}
        >
          <div
            style={{
              position: "relative",
              width: BOARD_PX,
              height: BOARD_PX,
              borderRadius: 4,
              overflow: "hidden",
              boxShadow: "inset 0 0 0 3px #2a1a0d",
            }}
          >
            {/* squares */}
            {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => {
              const { row, col } = squareToRowCol(n);
              const isLight = (row + col) % 2 === 0;
              const hasLadderStart = LADDERS[n] !== undefined;
              const hasSnakeStart = SNAKES[n] !== undefined;
              return (
                <div
                  key={n}
                  style={{
                    position: "absolute",
                    left: col * CELL,
                    top: BOARD_PX - (row + 1) * CELL,
                    width: CELL,
                    height: CELL,
                    background: isLight ? "#f4ecd8" : "#8fb87f",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-end",
                    boxSizing: "border-box",
                    padding: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: isLight ? "#a8987a" : "#5a7a4f",
                      fontFamily: "system-ui, sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {n}
                  </span>
                </div>
              );
            })}

            {/* SVG overlay for snakes and ladders */}
            <svg
              width={BOARD_PX}
              height={BOARD_PX}
              style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
            >
              {/* Ladders */}
              {ladderPaths.map(({ from, a, b }) => {
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const nx = -dy / len;
                const ny = dx / len;
                const railOffset = 7;
                const rungCount = Math.max(3, Math.floor(len / 16));
                return (
                  <g key={`ladder-${from}`}>
                    <line
                      x1={a.x + nx * railOffset}
                      y1={a.y + ny * railOffset}
                      x2={b.x + nx * railOffset}
                      y2={b.y + ny * railOffset}
                      stroke="#a8761f"
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                    <line
                      x1={a.x - nx * railOffset}
                      y1={a.y - ny * railOffset}
                      x2={b.x - nx * railOffset}
                      y2={b.y - ny * railOffset}
                      stroke="#a8761f"
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                    {Array.from({ length: rungCount }, (_, i) => {
                      const t = (i + 0.5) / rungCount;
                      const cx = a.x + dx * t;
                      const cy = a.y + dy * t;
                      return (
                        <line
                          key={i}
                          x1={cx + nx * railOffset}
                          y1={cy + ny * railOffset}
                          x2={cx - nx * railOffset}
                          y2={cy - ny * railOffset}
                          stroke="#d4a017"
                          strokeWidth={3.5}
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Snakes */}
              {snakePaths.map(({ from, d, a }) => (
                <g key={`snake-${from}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke="#7a1f1f"
                    strokeWidth={10}
                    strokeLinecap="round"
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke="#c1442e"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke="#e8a87c"
                    strokeWidth={1.5}
                    strokeDasharray="2,5"
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                  {/* snake head */}
                  <circle cx={a.x} cy={a.y} r={9} fill="#c1442e" stroke="#5a1414" strokeWidth={2} />
                  <circle cx={a.x - 3} cy={a.y - 3} r={1.6} fill="#fff" />
                  <circle cx={a.x + 3} cy={a.y - 3} r={1.6} fill="#fff" />
                </g>
              ))}
            </svg>

            {/* tokens */}
            {Array.from({ length: numPlayers }, (_, i) => i).map((i) => {
              const { x, y } = squareToXY(renderPositions[i]);
              const stack = numPlayers > 1 ? 10 : 0;
              const offsetX = ((i % 2) - 0.5) * 16;
              const offsetY = (Math.floor(i / 2) - 0.5) * 16;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: x + offsetX - 9,
                    top: y + offsetY - 9,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: `radial-gradient(circle at 35% 30%, ${PLAYER_COLORS[i].light}, ${PLAYER_COLORS[i].main})`,
                    border: "2px solid rgba(0,0,0,0.35)",
                    boxShadow: "0 3px 6px rgba(0,0,0,0.4)",
                    transition: "left 0.13s ease, top 0.13s ease",
                    zIndex: 10 + i,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: 220,
          }}
        >
          {/* players */}
          <div
            style={{
              background: "rgba(244,236,216,0.08)",
              border: "1px solid rgba(244,236,216,0.15)",
              borderRadius: 10,
              padding: 14,
            }}
          >
            {Array.from({ length: numPlayers }, (_, i) => i).map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: current === i && !winner ? "rgba(212,160,23,0.18)" : "transparent",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: PLAYER_COLORS[i].main,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                  }}
                />
                <span
                  style={{
                    color: "#f4ecd8",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: current === i ? 700 : 400,
                  }}
                >
                  {PLAYER_COLORS[i].name}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    color: "#a8987a",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 12,
                  }}
                >
                  {positions[i]}
                </span>
              </div>
            ))}
          </div>

          {/* dice */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              background: "rgba(244,236,216,0.08)",
              border: "1px solid rgba(244,236,216,0.15)",
              borderRadius: 10,
              padding: 18,
            }}
          >
            <Dice value={dice} rolling={rolling} />
            <button
              onClick={rollDice}
              disabled={rolling || moving || !!winner}
              style={{
                background:
                  rolling || moving || winner
                    ? "rgba(212,160,23,0.3)"
                    : "linear-gradient(135deg, #d4a017, #b8860b)",
                color: "#2a1a0d",
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "system-ui, sans-serif",
                letterSpacing: 0.5,
                cursor: rolling || moving || winner ? "default" : "pointer",
                boxShadow: rolling || moving || winner ? "none" : "0 4px 12px rgba(212,160,23,0.35)",
                width: "100%",
              }}
            >
              {rolling ? "Rolling…" : "Roll Dice"}
            </button>
          </div>

          {/* message */}
          <div
            style={{
              background: "rgba(244,236,216,0.08)",
              border: "1px solid rgba(244,236,216,0.15)",
              borderRadius: 10,
              padding: "12px 14px",
              color: "#f4ecd8",
              fontFamily: "system-ui, sans-serif",
              fontSize: 13,
              lineHeight: 1.5,
              minHeight: 40,
            }}
          >
            {message}
          </div>

          {winner !== null && (
            <button
              onClick={resetGame}
              style={{
                background: "transparent",
                color: "#f4ecd8",
                border: "1px solid rgba(244,236,216,0.4)",
                borderRadius: 8,
                padding: "9px 16px",
                fontSize: 13,
                fontFamily: "system-ui, sans-serif",
                cursor: "pointer",
              }}
            >
              New Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Dice ----------
function Dice({ value, rolling }) {
  const pipPositions = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
  };
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 10,
        background: "linear-gradient(135deg, #fdfaf2, #e8e0cc)",
        boxShadow: "0 4px 10px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.1)",
        position: "relative",
        transform: rolling ? "rotate(8deg) scale(0.94)" : "rotate(0deg) scale(1)",
        transition: "transform 0.08s ease",
      }}
    >
      <svg width="56" height="56" viewBox="0 0 100 100">
        {pipPositions[value].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={7} fill="#2a1a0d" />
        ))}
      </svg>
    </div>
  );
}

// ---------- Start screen ----------
function StartScreen({ onStart }) {
  const [n, setN] = useState(2);
  return (
    <div
      style={{
        minHeight: "100%",
        background: "radial-gradient(circle at 30% 20%, #1c4d3c, #0d3b2e 60%, #07241b)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        fontFamily: "Georgia, 'Palatino Linotype', serif",
        gap: 24,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            color: "#f4ecd8",
            fontSize: 38,
            letterSpacing: 3,
            margin: 0,
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          Snakes &amp; Ladders
        </h1>
        <div
          style={{
            color: "#d4a017",
            fontSize: 13,
            letterSpacing: 2,
            marginTop: 8,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 600,
          }}
        >
          A CLASSIC GAME OF LUCK
        </div>
      </div>

      <div
        style={{
          background: "rgba(244,236,216,0.08)",
          border: "1px solid rgba(244,236,216,0.15)",
          borderRadius: 14,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          alignItems: "center",
          minWidth: 280,
        }}
      >
        <div style={{ color: "#a8987a", fontFamily: "system-ui, sans-serif", fontSize: 13, letterSpacing: 1 }}>
          NUMBER OF PLAYERS
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[2, 3, 4].map((opt) => (
            <button
              key={opt}
              onClick={() => setN(opt)}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: n === opt ? "2px solid #d4a017" : "1px solid rgba(244,236,216,0.3)",
                background: n === opt ? "rgba(212,160,23,0.2)" : "transparent",
                color: "#f4ecd8",
                fontSize: 16,
                fontFamily: "system-ui, sans-serif",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {Array.from({ length: n }, (_, i) => i).map((i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: PLAYER_COLORS[i].main,
              }}
            />
          ))}
        </div>
        <button
          onClick={() => onStart(n)}
          style={{
            background: "linear-gradient(135deg, #d4a017, #b8860b)",
            color: "#2a1a0d",
            border: "none",
            borderRadius: 8,
            padding: "12px 36px",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 0.5,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(212,160,23,0.35)",
            marginTop: 6,
          }}
        >
          Start Game
        </button>
      </div>
    </div>
  );
}