// FullScreenLoader.jsx
import React, { useState, useEffect } from "react";
import "../styles/FullScreenLoader.css";

const FullScreenLoader = () => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Empieza fadeOut justo antes de desmontarse (ajustable según tu minDuration)
    const timer = setTimeout(() => setFadeOut(true), 1800); // 200ms antes de 2s

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`fullscreen-loader ${fadeOut ? "fade-out" : ""}`}>
      <div className="loader"></div>
    </div>
  );
};

export default FullScreenLoader;
