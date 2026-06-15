import { useState } from "react";

const links = ["Home", "Games", "Leaderboard", "Community", "About"];

export default function Navbar() {
  const [active, setActive] = useState("Home");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <style>{`
        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: rgba(10, 10, 15, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(124, 58, 237, 0.2);
        }
        .nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo {
          font-size: 20px;
          font-weight: 700;
          color: #f1f0f5;
          letter-spacing: -0.5px;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .logo-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #7c3aed;
          box-shadow: 0 0 8px #7c3aed;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 4px;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .nav-links a {
          display: block;
          padding: 6px 14px;
          font-size: 14px;
          color: #9d9ab0;
          text-decoration: none;
          border-radius: 6px;
          transition: color 150ms, background 150ms;
        }
        .nav-links a:hover {
          color: #f1f0f5;
          background: rgba(124, 58, 237, 0.12);
        }
        .nav-links a.active {
          color: #f1f0f5;
          background: rgba(124, 58, 237, 0.18);
          position: relative;
        }
        .nav-links a.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 2px;
          border-radius: 2px;
          background: #7c3aed;
          box-shadow: 0 0 6px #7c3aed;
        }
        .hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }
        .hamburger span {
          display: block;
          width: 22px;
          height: 2px;
          background: #9d9ab0;
          border-radius: 2px;
          transition: transform 250ms, opacity 250ms;
        }
        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .mobile-menu {
          display: none;
          flex-direction: column;
          padding: 12px 24px 20px;
          border-top: 1px solid rgba(124, 58, 237, 0.15);
          gap: 2px;
        }
        .mobile-menu a {
          padding: 10px 12px;
          font-size: 15px;
          color: #9d9ab0;
          text-decoration: none;
          border-radius: 6px;
          transition: color 150ms, background 150ms;
        }
        .mobile-menu a:hover,
        .mobile-menu a.active {
          color: #f1f0f5;
          background: rgba(124, 58, 237, 0.14);
        }
        @media (max-width: 640px) {
          .nav-links { display: none; }
          .hamburger { display: flex; }
          .mobile-menu { display: flex; }
        }
      `}</style>

      <nav className="nav">
        <div className="nav-inner">
          <a href="#" className="logo">
            <span className="logo-dot" />
            VINT-GAME
          </a>

          <ul className="nav-links">
            {links.map((link) => (
              <li key={link}>
                <a
                  href="#"
                  className={active === link ? "active" : ""}
                  onClick={(e) => { e.preventDefault(); setActive(link); }}
                >
                  {link}
                </a>
              </li>
            ))}
          </ul>

          <button
            className={`hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {menuOpen && (
          <div className="mobile-menu">
            {links.map((link) => (
              <a
                key={link}
                href="#"
                className={active === link ? "active" : ""}
                onClick={(e) => { e.preventDefault(); setActive(link); setMenuOpen(false); }}
              >
                {link}
              </a>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}