import { useNavigate } from "react-router-dom";
import snake from "./images/snake.jpg"

const games = [
  {
    id: 1,
    title: "Snake game",
    genre: "animal",
    rating: 4.1,
    players: "2",
    image: snake,
    tag: "Hot",
    path: "/Snake"
  },
  {
    id: 2,
    title: "Void Protocol",
    genre: "FPS",
    rating: 4.5,
    players: "1.1M",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80",
    tag: "New",
  },
  {
    id: 3,
    title: "Neon Drift",
    genre: "Racing",
    rating: 4.2,
    players: "890K",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80",
    tag: null,
  },
  {
    id: 3,
    title: "Neon Drift",
    genre: "Racing",
    rating: 4.2,
    players: "890K",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80",
    tag: null,
  },
  {
    id: 3,
    title: "Neon Drift",
    genre: "Racing",
    rating: 4.2,
    players: "890K",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80",
    tag: null,
  },
  {
    id: 3,
    title: "Neon Drift",
    genre: "Racing",
    rating: 4.2,
    players: "890K",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80",
    tag: null,
  },
  {
    id: 3,
    title: "Neon Drift",
    genre: "Racing",
    rating: 4.2,
    players: "890K",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80",
    tag: null,
  },
  {
    id: 3,
    title: "Neon Drift",
    genre: "Racing",
    rating: 4.2,
    players: "890K",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80",
    tag: null,
  },
  {
    id: 3,
    title: "Neon Drift",
    genre: "Racing",
    rating: 4.2,
    players: "890K",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80",
    tag: null,
  },
  {
    id: 3,
    title: "Neon Drift",
    genre: "Racing",
    rating: 4.2,
    players: "890K",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80",
    tag: null,
  },
  {
    id: 3,
    title: "Neon Drift",
    genre: "Racing",
    rating: 4.2,
    players: "890K",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80",
    tag: null,
  },
  {
    id: 3,
    title: "Neon Drift",
    genre: "Racing",
    rating: 4.2,
    players: "890K",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80",
    tag: null,
  }
];

const tagColors = {
  Hot: { bg: "rgba(220, 38, 38, 0.2)", color: "#f87171", border: "rgba(220,38,38,0.4)" },
  New: { bg: "rgba(124, 58, 237, 0.2)", color: "#a78bfa", border: "rgba(124,58,237,0.4)" },
};

function StarRating({ rating }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={s <= Math.round(rating) ? "#7c3aed" : "#2e2a3d"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span style={{ fontSize: "12px", color: "#9d9ab0", marginLeft: "2px" }}>{rating}</span>
    </div>
  );
}

function GameCard({ game }) {
  const tag = game.tag ? tagColors[game.tag] : null;
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        .game-card {
          width: 220px;
          border-radius: 12px;
          overflow: hidden;
          background: #1a1425;
          border: 1px solid rgba(124, 58, 237, 0.15);
          transition: transform 220ms, box-shadow 220ms, border-color 220ms;
          cursor: pointer;
          flex-shrink: 0;
        }
        .game-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.35);
          border-color: rgba(124, 58, 237, 0.4);
        }
        .game-card:hover .play-overlay {
          opacity: 1;
        }
        .game-card:hover .cover-img {
          transform: scale(1.05);
        }
      `}</style>

      <div className="game-card">
        {/* Cover image */}
        <div style={{ position: "relative", height: "140px", overflow: "hidden" }}>
          <img
            className="cover-img"
            src={game.image}
            alt={game.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "transform 300ms",
            }}
          />
          {/* Gradient overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, #1a1425 0%, transparent 60%)",
          }} />
          {/* Tag */}
          {tag && (
            <span style={{
              position: "absolute", top: "10px", left: "10px",
              fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px",
              padding: "3px 8px", borderRadius: "20px",
              background: tag.bg, color: tag.color,
              border: `1px solid ${tag.border}`,
              textTransform: "uppercase",
            }}>
              {game.tag}
            </span>
          )}
          {/* Play button overlay */}
          <div className="play-overlay" style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 0, transition: "opacity 220ms",
            background: "rgba(0,0,0,0.35)",
          }}>
            <div style={{
              width: "42px", height: "42px", borderRadius: "50%",
              background: "#7c3aed",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px rgba(124,58,237,0.7)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: "12px 14px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{
              fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px",
              color: "#7c3aed", textTransform: "uppercase",
            }}>
              {game.genre}
            </span>
            <span style={{ fontSize: "11px", color: "#6b6880", display: "flex", alignItems: "center", gap: "3px" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#6b6880">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              {game.players}
            </span>
          </div>

          <p style={{
            margin: "0 0 8px", fontSize: "15px", fontWeight: 600,
            color: "#f1f0f5", lineHeight: 1.3,
          }}>
            {game.title}
          </p>

          <StarRating rating={game.rating} />

          <button
            style={{
              marginTop: "12px",
              width: "100%",
              padding: "8px 0",
              borderRadius: "8px",
              border: "none",
              background: "#7c3aed",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.3px",
              cursor: "pointer",
              transition: "background 180ms, box-shadow 180ms",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#6d28d9";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(124,58,237,0.6)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#7c3aed";
              e.currentTarget.style.boxShadow = "none";
            }}
            onClick={() => navigate(game.path)}
          >
            ▶ Play Now
          </button>
        </div>
      </div>
    </>
  );
}

export default function GameCards() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "100px 24px 40px",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ display: "flex", gap: "40px", flexWrap: "wrap", justifyContent: "center" }}>
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}