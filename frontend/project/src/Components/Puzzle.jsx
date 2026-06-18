import React, { useState, useEffect } from "react";

const PuzzleGame = () => {
  const [level, setLevel] = useState(1);
  const [tiles, setTiles] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [moves, setMoves] = useState(0);

  const getGridSize = () => {
    if (level <= 5) return 3;
    if (level <= 10) return 4;
    if (level <= 15) return 5;
    return 6;
  };

  const createPuzzle = () => {
    const size = getGridSize();
    const total = size * size;

    let arr = [...Array(total).keys()];

    for (let i = 0; i < level * 10; i++) {
      const empty = arr.indexOf(total - 1);
      const row = Math.floor(empty / size);
      const col = empty % size;

      const possible = [];

      if (row > 0) possible.push(empty - size);
      if (row < size - 1) possible.push(empty + size);
      if (col > 0) possible.push(empty - 1);
      if (col < size - 1) possible.push(empty + 1);

      const target =
        possible[Math.floor(Math.random() * possible.length)];

      [arr[empty], arr[target]] = [arr[target], arr[empty]];
    }

    setTiles(arr);
    setCompleted(false);
    setMoves(0);
  };

  useEffect(() => {
    createPuzzle();
  }, [level]);

  const handleTileClick = (index) => {
    const size = getGridSize();
    const empty = tiles.indexOf(size * size - 1);

    const row1 = Math.floor(index / size);
    const col1 = index % size;

    const row2 = Math.floor(empty / size);
    const col2 = empty % size;

    const valid =
      Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1;

    if (!valid) return;

    const newTiles = [...tiles];
    [newTiles[index], newTiles[empty]] = [
      newTiles[empty],
      newTiles[index],
    ];

    setTiles(newTiles);
    setMoves((m) => m + 1);

    const solved = newTiles.every((v, i) => v === i);

    if (solved) {
      setCompleted(true);

      setTimeout(() => {
        if (level < 20) {
          setLevel(level + 1);
        }
      }, 1200);
    }
  };

  const size = getGridSize();

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#0f172a,#1e293b,#312e81)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 20,
        fontFamily: "Arial",
      }}
    >
      <h1
        style={{
          fontSize: "3rem",
          marginBottom: 10,
          textShadow: "0 0 15px cyan",
        }}
      >
        Puzzle Master
      </h1>

      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 20,
          fontSize: 20,
          fontWeight: "bold",
        }}
      >
        <span>Level: {level}/20</span>
        <span>Moves: {moves}</span>
      </div>

      {completed && (
        <div
          style={{
            marginBottom: 15,
            color: "#4ade80",
            fontSize: 24,
            fontWeight: "bold",
          }}
        >
          Level Complete!
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${size},70px)`,
          gap: 6,
          background: "rgba(255,255,255,0.1)",
          padding: 15,
          borderRadius: 20,
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 30px rgba(0,255,255,0.3)",
        }}
      >
        {tiles.map((tile, index) => (
          <button
            key={index}
            onClick={() => handleTileClick(index)}
            style={{
              width: 70,
              height: 70,
              border: "none",
              borderRadius: 15,
              cursor:
                tile === size * size - 1
                  ? "default"
                  : "pointer",
              fontSize: 22,
              fontWeight: "bold",
              color: "white",
              background:
                tile === size * size - 1
                  ? "transparent"
                  : "linear-gradient(135deg,#06b6d4,#3b82f6)",
              boxShadow:
                tile === size * size - 1
                  ? "none"
                  : "0 4px 10px rgba(0,0,0,.4)",
              transition: "0.2s",
            }}
          >
            {tile !== size * size - 1 ? tile + 1 : ""}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 25 }}>
        <button
          onClick={createPuzzle}
          style={{
            padding: "12px 25px",
            border: "none",
            borderRadius: 12,
            background: "#22c55e",
            color: "white",
            fontSize: 18,
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Restart Level
        </button>
      </div>

      {level === 20 && completed && (
        <div
          style={{
            marginTop: 25,
            fontSize: 28,
            color: "gold",
            fontWeight: "bold",
          }}
        >
          🏆 You Finished All 20 Levels!
        </div>
      )}
    </div>
  );
};

export default PuzzleGame;