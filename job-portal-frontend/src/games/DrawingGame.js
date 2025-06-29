import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Stage, Layer, Line, Rect } from 'react-konva';
import Swal from 'sweetalert2';
import '../styles/games.css';

const DrawingGame = ({ gameConfig, onGameComplete }) => {
  const { partidaId, equipoNumero } = useParams();
  const socket = useSocket();
  const stageRef = useRef(null);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('brush');
  const [showDemo, setShowDemo] = useState(false);
  const [currentDemoTeam, setCurrentDemoTeam] = useState(1);
  const [demoDrawings, setDemoDrawings] = useState({});
  const [totalTeams, setTotalTeams] = useState(0);
  const [lastColor, setLastColor] = useState('#000000');
  
  const userId = localStorage.getItem('userId');
  const isDrawing = useRef(false);
  const remoteLines = useRef({});
  const [tinta, setTinta] = useState(() => {
    const savedTinta = localStorage.getItem(`tinta-${partidaId}-${equipoNumero}-${userId}`);
    return savedTinta ? parseInt(savedTinta) : 5000;
  });
  const tintaConsumida = useRef(5000 - (localStorage.getItem(`tinta-${partidaId}-${equipoNumero}-${userId}`) ? parseInt(localStorage.getItem(`tinta-${partidaId}-${equipoNumero}-${userId}`)) : 5000));
  const MAX_TINTA = 5000;
  const lastPoint = useRef(null);
  const animationRef = useRef(null);
  const [lines, setLines] = useState(() => {
  const savedLines = localStorage.getItem(`lines-${partidaId}-${equipoNumero}-${userId}`);
    return savedLines ? JSON.parse(savedLines) : [];
  });

  // Persistir tinta en localStorage
  const persistTinta = (newTinta) => {
    localStorage.setItem(`tinta-${partidaId}-${equipoNumero}-${userId}`, newTinta.toString());
  };

  // Función para forzar actualización optimizada
  const [, forceUpdate] = useState();

  // Manejar cambio de color/herramienta
  const handleColorSelect = (colorHex) => {
    setColor(colorHex);
    if (tool === 'eraser') {
      setTool('brush');
    }
    setLastColor(colorHex);
  };

  

  // Iniciar nuevo trazo
  const startNewLine = (pos) => {
  const newLine = {
    points: [pos.x, pos.y],
    color: tool === 'eraser' ? '#ffffff' : color,
    strokeWidth: brushSize,
    userId: userId,
    id: Date.now() + Math.random().toString(36).substr(2, 9)
  };
  
  const updatedLines = [...lines, newLine];
  setLines(updatedLines);
  localStorage.setItem(`lines-${partidaId}-${equipoNumero}-${userId}`, JSON.stringify(updatedLines));
  
  return newLine;
};

  // Dibujar línea optimizado
  const drawLine = (point) => {
    if (!isDrawing.current || tinta <= 0) return;
    
    // Calcular consumo de tinta
    if (lastPoint.current) {
      const distance = Math.sqrt(
        Math.pow(point.x - lastPoint.current.x, 2) + 
        Math.pow(point.y - lastPoint.current.y, 2)
      );
      
      if (tintaConsumida.current + distance >= MAX_TINTA) {
        endDrawing();
        Swal.fire('¡Sin tinta!', 'Debes limpiar tu dibujo para recargar.', 'warning');
        return;
      }
      
      tintaConsumida.current += distance;
      const newTinta = MAX_TINTA - tintaConsumida.current;
      setTinta(newTinta);
      persistTinta(newTinta);
    }
    
    lastPoint.current = point;
    
    // Actualizar última línea
    if (lines.current.length === 0) {
      const newLine = startNewLine(point);
      emitDrawingAction('pathStart', newLine);
    } else {
      const lastLine = lines.current[lines.current.length - 1];
      lastLine.points = [...lastLine.points, point.x, point.y];
      
      // Enviar actualización optimizada
      if (lastLine.points.length % 3 === 0) {
        emitDrawingAction('pathUpdate', lastLine);
      }
    }
    
    // Renderizado optimizado
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(() => {
      forceUpdate({});
    });
  };

  // Emitir acción de dibujo
  const emitDrawingAction = (type, line) => {
    socket.emit('drawingAction', {
      partidaId,
      equipoNumero,
      userId,
      action: {
        type,
        path: {
          id: line.id,
          points: line.points,
          color: line.color,
          strokeWidth: line.strokeWidth
        }
      }
    });
  };

  // Finalizar dibujo
  const endDrawing = () => {
    if (!isDrawing.current) return;
    
    isDrawing.current = false;
    lastPoint.current = null;
    
    if (lines.current.length > 0) {
      const lastLine = lines.current[lines.current.length - 1];
      emitDrawingAction('pathComplete', lastLine);
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  // Eventos del mouse/touch
  const handleMouseDown = (e) => {
    if (tinta <= 0) return;
    
    const pos = e.target.getStage().getPointerPosition();
    isDrawing.current = true;
    startNewLine(pos);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    drawLine(point);
  };

  const handleMouseUp = () => endDrawing();

  // Limpiar dibujos del usuario actual
  const clearUserDrawing = () => {
    setLines([]);
    localStorage.removeItem(`lines-${partidaId}-${equipoNumero}-${userId}`);
    
    socket.emit('drawingAction', {
      partidaId,
      equipoNumero,
      userId,
      action: { 
        type: 'clear', 
        userId,
        tinta: MAX_TINTA
      }
    });

    tintaConsumida.current = 0;
    setTinta(MAX_TINTA);
    persistTinta(MAX_TINTA);
  };

  const colorPalette = [
    '#FF0000', '#FF3300', '#FF6600', '#FF9900', '#FFCC00', '#FFFF00',
    '#00FF00', '#00CC33', '#009966', '#006699', '#0033CC', '#0000FF',
    '#6600FF', '#9933FF', '#CC66FF', '#FF00FF', '#FF33CC', '#FF6699',
    '#000000', '#FFFFFF', '#888888'
  ];

  // Configuración de Socket.io
  useEffect(() => {
    if (!socket) return;

    // Escuchar acciones de dibujo remotas - Versión mejorada
    socket.on('drawingAction', (action) => {
      // Ignorar acciones propias
      if (action.userId === userId) return;

      // Crear estructura si no existe
      if (!remoteLines.current[action.userId]) {
        remoteLines.current[action.userId] = [];
      }

      switch (action.type) {
        case 'pathStart':
          remoteLines.current[action.userId].push(action.path);
          break;
          
        case 'pathUpdate':
        case 'pathComplete':
          const userLines = remoteLines.current[action.userId];
          const existingLineIndex = userLines.findIndex(line => line.id === action.path.id);
          
          if (existingLineIndex >= 0) {
            userLines[existingLineIndex] = action.path;
          } else {
            userLines.push(action.path);
          }
          break;
          
        case 'clear':
          delete remoteLines.current[action.userId];
          if (action.tinta !== undefined) {
            setTinta(action.tinta);
            persistTinta(action.tinta);
          }
          break;
      }
      
      forceUpdate({});
    });

    // Solicitar estado inicial del juego - Versión mejorada
    socket.emit('initDrawingGame', { partidaId, equipoNumero, userId });

    // Escuchar estado inicial del juego
    socket.on('drawingGameState', ({ actions, tintaState }) => {
      remoteLines.current = {};
      
      // Procesar todas las acciones recibidas
      actions.forEach(({ userId, path }) => {
        if (!remoteLines.current[userId]) {
          remoteLines.current[userId] = [];
        }
        remoteLines.current[userId].push(path);
      });
      
      // Restaurar estado de tinta
      if (tintaState && tintaState[userId]) {
        setTinta(tintaState[userId]);
        tintaConsumida.current = MAX_TINTA - tintaState[userId];
        persistTinta(tintaState[userId]);
      }
      
      forceUpdate({});
    });

    return () => {
      socket.off('drawingAction');
      socket.off('drawingGameState');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [socket, partidaId, equipoNumero, userId]);

  // ... (resto del componente, incluyendo renderizado y controles UI)

  return (
    <div className="drawing-game-container">
      <div className="drawing-tools-horizontal-extended">
        {/* Sección de colores */}
        <div className="colors-section-extended">
          <div className="color-palette-wide">
            <div className="color-rows-container">
              <div className="color-row">
                {colorPalette.map((colorHex, index) => (
                  <button
                    key={`color-${index}`}
                    className={`color-chip ${color === colorHex ? 'active' : ''}`}
                    style={{ backgroundColor: colorHex }}
                    onClick={() => handleColorSelect(colorHex)}
                  />
                ))}
              </div>
            </div>
            <div className="custom-color-container">
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="custom-color-picker-large"
              />
            </div>
          </div>
        </div>                    
        
        {/* Sección de herramientas */}
        <div className="tools-section-extended">                    
          <div className="tool-row">
            <button 
              className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
              onClick={() => setTool('brush')}
              title="Pincel"
            >
              <i className="fas fa-paint-brush"></i>
            </button>
            <button 
              className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => setTool('eraser')}
              title="Borrador"
            >
              <i className="fas fa-eraser"></i>
            </button>                                   
            <button 
              className="tool-btn"
              onClick={clearUserDrawing}
              title="Limpiar mi dibujo"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
            <div className="tinta-tank-vertical" style={{ height: '100px', width: '30px' }}>
            <div
              className={`tinta-tank-fill ${
                tinta <= 1000 ? 'tinta-tank-critical' : tinta <= 3000 ? 'tinta-tank-low' : ''
              }`}
              style={{ 
                height: `${(tinta / MAX_TINTA) * 100}%`,
                transition: 'height 0.3s ease'
              }}
            />
          </div>
          </div>
        </div>              
        
        {/* Control de tamaño */}
        <div className="size-section">
          <div className="size-controls-horizontal">            
            <div className="size-indicator">              
              <input
                type="range"
                min="1"
                max="30"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="size-slider-horizontal"
              />
            </div>
            <span>{brushSize}px</span>
          </div>
        </div>
      </div>
      
      {/* Canvas de dibujo */}
      <div className="canvas-container">
        <Stage
          width={800}
          height={600}
          ref={stageRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <Layer>
            {/* Fondo blanco */}
            <Rect width={800} height={600} fill="#ffffff" listening={false} />
            
            {/* Líneas remotas */}
            {Object.entries(remoteLines.current).map(([userId, userLines]) => (
              userLines.map((line) => (
                line?.points?.length > 0 && (
                  <Line
                    key={`remote-${userId}-${line.id}`}
                    points={line.points}
                    stroke={line.color}
                    strokeWidth={line.strokeWidth}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    listening={false}
                    globalCompositeOperation={
                      line.color === '#ffffff' ? 'destination-out' : 'source-over'
                    }
                  />
                )
              ))
            ))}
            
            {/* Líneas locales */}
            {lines.current.map((line) => (
              line?.points?.length > 0 && (
                <Line
                  key={`local-${line.id}`}
                  points={line.points}
                  stroke={line.color}
                  strokeWidth={line.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  listening={false}
                  globalCompositeOperation={
                    line.color === '#ffffff' ? 'destination-out' : 'source-over'
                  }
                />
              )
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default DrawingGame;