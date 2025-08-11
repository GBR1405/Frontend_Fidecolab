import React, { useState, useEffect } from "react";

const LS_KEY = "accessible-widget-settings";

function saveSettings(settings) {
  localStorage.setItem(LS_KEY, JSON.stringify(settings));
}

function loadSettings() {
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

const styles = {
  widget: {
    position: "fixed",
    bottom: 20,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
    boxShadow: "0 0 10px rgba(0,0,0,0.3)",
    zIndex: 10000,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    userSelect: "none",
    width: 250,
  },
  toggleButton: {
    backgroundColor: "#0078d4",
    border: "none",
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    cursor: "pointer",
    width: "100%",
    padding: "8px 0",
    borderRadius: "8px 8px 0 0",
  },
  menu: {
    padding: 15,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    fontSize: 14,
    color: "#333",
  },
  label: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkbox: {
    transform: "scale(1.3)",
  },
  buttonGroup: {
    display: "flex",
    gap: 10,
  },
  button: {
    flex: 1,
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #0078d4",
    backgroundColor: "#e1f0ff",
    color: "#0078d4",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [underlineLinks, setUnderlineLinks] = useState(false);
  const [largeCursor, setLargeCursor] = useState(false);

  useEffect(() => {
    const settings = loadSettings();
    if (settings) {
      setFontSize(settings.fontSize || 100);
      setHighContrast(settings.highContrast || false);
      setUnderlineLinks(settings.underlineLinks || false);
      setLargeCursor(settings.largeCursor || false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize + "%";

    if (highContrast) {
      document.body.classList.add("aw-high-contrast");
    } else {
      document.body.classList.remove("aw-high-contrast");
    }
    if (underlineLinks) {
      document.body.classList.add("aw-underline-links");
    } else {
      document.body.classList.remove("aw-underline-links");
    }
    if (largeCursor) {
      document.body.classList.add("aw-large-cursor");
    } else {
      document.body.classList.remove("aw-large-cursor");
    }

    saveSettings({ fontSize, highContrast, underlineLinks, largeCursor });
  }, [fontSize, highContrast, underlineLinks, largeCursor]);

  return (
    <div style={styles.widget} aria-label="Panel de accesibilidad" role="region">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="aw-menu"
        style={styles.toggleButton}
      >
        ♿ Accesibilidad
      </button>
      {open && (
        <div id="aw-menu" style={styles.menu}>
          <div style={styles.label}>
            Tamaño texto: {fontSize}%
          </div>
          <div style={styles.buttonGroup}>
            <button
              onClick={() => setFontSize((v) => Math.max(v - 10, 50))}
              style={styles.button}
              aria-label="Disminuir tamaño de texto"
            >
              A-
            </button>
            <button
              onClick={() => setFontSize((v) => Math.min(v + 10, 200))}
              style={styles.button}
              aria-label="Aumentar tamaño de texto"
            >
              A+
            </button>
          </div>

          <label style={styles.label}>
            <span>Contraste alto</span>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={() => setHighContrast(!highContrast)}
              style={styles.checkbox}
            />
          </label>

          <label style={styles.label}>
            <span>Subrayar enlaces</span>
            <input
              type="checkbox"
              checked={underlineLinks}
              onChange={() => setUnderlineLinks(!underlineLinks)}
              style={styles.checkbox}
            />
          </label>

          <label style={styles.label}>
            <span>Cursor grande</span>
            <input
              type="checkbox"
              checked={largeCursor}
              onChange={() => setLargeCursor(!largeCursor)}
              style={styles.checkbox}
            />
          </label>
        </div>
      )}

      <style>{`
        /* Alto contraste */
        .aw-high-contrast {
          background-color: #000 !important;
          color: #fff !important;
        }
        .aw-high-contrast a {
          color: #0ff !important;
        }
        /* Subrayar enlaces */
        .aw-underline-links a {
          text-decoration: underline !important;
        }
        /* Cursor grande */
        .aw-large-cursor, .aw-large-cursor * {
          cursor: url('https://cdn-icons-png.flaticon.com/512/54/54497.png'), auto !important;
        }
      `}</style>
    </div>
  );
}
