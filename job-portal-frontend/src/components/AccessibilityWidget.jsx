import React, { useState, useEffect } from "react";

// CSS dentro para que sea todo en uno, pero luego puedes moverlo a CSS externo
const styles = {
  widget: {
    position: "fixed",
    bottom: 20,
    right: 20,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 0 10px rgba(0,0,0,0.3)",
    zIndex: 9999,
    fontFamily: "'Poppins', sans-serif",
    userSelect: "none",
  },
  button: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 24,
    padding: "10px 14px",
    color: "#444",
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 12,
    borderTop: "1px solid #ddd",
  },
  toggleButton: {
    padding: "6px 10px",
    fontSize: 14,
    cursor: "pointer",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#f5f5f5",
  },
  label: {
    fontSize: 14,
    userSelect: "none",
  },
};

const LS_KEY = "fidecolab-accessibility";

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

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [underlineLinks, setUnderlineLinks] = useState(false);
  const [largeCursor, setLargeCursor] = useState(false);

  // Cargar settings guardados al montar
  useEffect(() => {
    const settings = loadSettings();
    if (settings) {
      setFontSize(settings.fontSize || 100);
      setHighContrast(settings.highContrast || false);
      setDyslexiaFont(settings.dyslexiaFont || false);
      setUnderlineLinks(settings.underlineLinks || false);
      setLargeCursor(settings.largeCursor || false);
    }
  }, []);

  // Aplicar estilos globales cada vez que cambia algo
  useEffect(() => {
    document.documentElement.style.fontSize = fontSize + "%";

    if (highContrast) {
      document.body.classList.add("fidecolab-high-contrast");
    } else {
      document.body.classList.remove("fidecolab-high-contrast");
    }

    if (dyslexiaFont) {
      document.body.classList.add("fidecolab-dyslexia-font");
    } else {
      document.body.classList.remove("fidecolab-dyslexia-font");
    }

    if (underlineLinks) {
      document.body.classList.add("fidecolab-underline-links");
    } else {
      document.body.classList.remove("fidecolab-underline-links");
    }

    if (largeCursor) {
      document.body.classList.add("fidecolab-large-cursor");
    } else {
      document.body.classList.remove("fidecolab-large-cursor");
    }

    // Guardar configuración
    saveSettings({ fontSize, highContrast, dyslexiaFont, underlineLinks, largeCursor });
  }, [fontSize, highContrast, dyslexiaFont, underlineLinks, largeCursor]);

  return (
    <div style={styles.widget} aria-label="Panel de accesibilidad" role="region">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="accessibility-menu"
        title="Opciones de accesibilidad"
        style={styles.button}
      >
        <i className="fas fa-universal-access" aria-hidden="true"></i>
        <span className="sr-only">Abrir menú accesibilidad</span>
      </button>
      {open && (
        <div id="accessibility-menu" style={styles.menu}>
          <label style={styles.label}>
            Tamaño texto: {fontSize}%
            <br />
            <button
              onClick={() => setFontSize((v) => Math.min(v + 10, 200))}
              style={styles.toggleButton}
              aria-label="Aumentar tamaño de texto"
            >
              A+
            </button>
            <button
              onClick={() => setFontSize((v) => Math.max(v - 10, 50))}
              style={styles.toggleButton}
              aria-label="Disminuir tamaño de texto"
            >
              A-
            </button>
          </label>

          <label style={styles.label}>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={() => setHighContrast(!highContrast)}
            />{" "}
            Contraste alto
          </label>

          <label style={styles.label}>
            <input
              type="checkbox"
              checked={dyslexiaFont}
              onChange={() => setDyslexiaFont(!dyslexiaFont)}
            />{" "}
            Fuente amigable para dislexia
          </label>

          <label style={styles.label}>
            <input
              type="checkbox"
              checked={underlineLinks}
              onChange={() => setUnderlineLinks(!underlineLinks)}
            />{" "}
            Subrayar enlaces
          </label>

          <label style={styles.label}>
            <input
              type="checkbox"
              checked={largeCursor}
              onChange={() => setLargeCursor(!largeCursor)}
            />{" "}
            Cursor grande
          </label>
        </div>
      )}

      {/* Estilos CSS para clases especiales */}
      <style>{`
        /* Alto contraste */
        .fidecolab-high-contrast {
          background-color: black !important;
          color: yellow !important;
        }
        .fidecolab-high-contrast a {
          color: cyan !important;
          text-decoration: underline !important;
        }
        /* Fuente amigable para dislexia (OpenDyslexic) */
        @font-face {
          font-family: 'OpenDyslexic';
          src: url('https://cdn.jsdelivr.net/gh/antijingoist/open-dyslexic/alternates/OpenDyslexic3-Regular.otf') format('opentype');
        }
        .fidecolab-dyslexia-font {
          font-family: 'OpenDyslexic', Arial, sans-serif !important;
        }
        /* Subrayar enlaces */
        .fidecolab-underline-links a {
          text-decoration: underline !important;
        }
        /* Cursor grande */
        .fidecolab-large-cursor, .fidecolab-large-cursor * {
          cursor: url('https://cdn-icons-png.flaticon.com/512/54/54497.png'), auto !important;
        }
      `}</style>
    </div>
  );
}
