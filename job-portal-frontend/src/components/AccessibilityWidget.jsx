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
    width: 260,
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
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [easyReadMode, setEasyReadMode] = useState(false);

  useEffect(() => {
    const settings = loadSettings();
    if (settings) {
      setFontSize(settings.fontSize || 100);
      setHighContrast(settings.highContrast || false);
      setUnderlineLinks(settings.underlineLinks || false);
      setLargeCursor(settings.largeCursor || false);
      setDyslexiaFont(settings.dyslexiaFont || false);
      setEasyReadMode(settings.easyReadMode || false);
    }
  }, []);

  useEffect(() => {
    // Tamaño texto con variable CSS para que puedas usar en CSS de app si quieres
    document.documentElement.style.setProperty("--accessible-font-size", fontSize + "%");
    // También aplicamos font-size base para todo el body para afectar más cosas
    document.body.style.fontSize = fontSize + "%";

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
    if (dyslexiaFont) {
      document.body.classList.add("aw-dyslexia-font");
    } else {
      document.body.classList.remove("aw-dyslexia-font");
    }
    if (easyReadMode) {
      document.body.classList.add("aw-easy-read");
    } else {
      document.body.classList.remove("aw-easy-read");
    }

    saveSettings({ fontSize, highContrast, underlineLinks, largeCursor, dyslexiaFont, easyReadMode });
  }, [fontSize, highContrast, underlineLinks, largeCursor, dyslexiaFont, easyReadMode]);

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

          <label style={styles.label}>
            <span>Fuente amigable para dislexia</span>
            <input
              type="checkbox"
              checked={dyslexiaFont}
              onChange={() => setDyslexiaFont(!dyslexiaFont)}
              style={styles.checkbox}
            />
          </label>

          <label style={styles.label}>
            <span>Modo lectura fácil</span>
            <input
              type="checkbox"
              checked={easyReadMode}
              onChange={() => setEasyReadMode(!easyReadMode)}
              style={styles.checkbox}
            />
          </label>
        </div>
      )}

      <style>{`
        /* Alto contraste: fondo negro, texto blanco, links cyan */
        .aw-high-contrast {
          background-color: #000 !important;
          color: #fff !important;
        }
        .aw-high-contrast a,
        .aw-high-contrast button,
        .aw-high-contrast input,
        .aw-high-contrast select,
        .aw-high-contrast textarea {
          color: #0ff !important;
          background-color: transparent !important;
          border-color: #0ff !important;
        }
        .aw-high-contrast a:hover,
        .aw-high-contrast button:hover,
        .aw-high-contrast input:hover,
        .aw-high-contrast select:hover,
        .aw-high-contrast textarea:hover {
          color: #ff0 !important;
          border-color: #ff0 !important;
        }
        /* Subrayar enlaces */
        .aw-underline-links a {
          text-decoration: underline !important;
        }
        /* Cursor grande */
        .aw-large-cursor, .aw-large-cursor * {
          cursor: pointer !important;
          cursor: url('https://cdn-icons-png.flaticon.com/512/32/32339.png'), auto !important;
        }
        /* Fuente amigable para dislexia: OpenDyslexic */
        @font-face {
          font-family: 'OpenDyslexic';
          src: url('https://cdn.jsdelivr.net/gh/antijingoist/open-dyslexic/OpenDyslexic-Regular.otf') format('opentype');
        }
        .aw-dyslexia-font {
          font-family: 'OpenDyslexic', Comic Sans MS, Arial, sans-serif !important;
        }
        /* Modo lectura fácil: saturación y escala de grises reducida para facilitar lectura */
        .aw-easy-read {
          filter: grayscale(0.2) contrast(1.2) saturate(1.1);
          line-height: 1.6;
          letter-spacing: 0.03em;
        }
      `}</style>
    </div>
  );
}
