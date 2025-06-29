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
  
  // Estados del dibujo
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('brush');
  const [lines, setLines] = useState([]);
  const [remoteLines, setRemoteLines] = useState({});
  const [tinta, setTinta] = useState(5000);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [lastColor, setLastColor] = useState('#000000');
  
  // Referencias y constantes
  const userId = localStorage.getItem('userId');
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  const animationRef = useRef(null);
  const tintaConsumida = useRef(0);
  const MAX_TINTA = 5000;
  const isUpdatingTinta = useRef(false);

  // Paleta de colores
  const colorPalette = [
    '#FF0000', '#FF3300', '#FF6600', '#FF9900', '#FFCC00', '#FFFF00',
    '#00FF00', '#00CC33', '#009966', '#006699', '#0033CC', '#0000FF',
    '#6600FF', '#9933FF', '#CC66FF', '#FF00FF', '#FF33CC', '#FF6699',
    '#000000', '#FFFFFF', '#888888'
  ];

  // Unirse al equipo de dibujo
  useEffect(() => {
    if (socket) {
      socket.emit('joinDrawingTeam', { partidaId, equipoNumero, userId });
    }
  }, [socket, partidaId, equipoNumero, userId]);

  // Manejar conexión socket y estados iniciales
  useEffect(() => {
    if (!socket) return;

    const handleInitialState = ({ tintaState }) => {
      if (tintaState?.[userId] !== undefined) {
        const parsedTinta = parseInt(tintaState[userId]);
        if (!isNaN(parsedTinta)) {
          isUpdatingTinta.current = true;
          setTinta(parsedTinta);
          tintaConsumida.current = MAX_TINTA - parsedTinta;
          isUpdatingTinta.current = false;
        }
      }
    };

    const handleTintaUpdate = (newTinta) => {
      if (isUpdatingTinta.current) return;
      
      isUpdatingTinta.current = true;
      setTinta(newTinta);
      tintaConsumida.current = MAX_TINTA - newTinta;
      isUpdatingTinta.current = false;
    };

    const handleDrawingAction = (action) => {
      if (!action || action.userId === userId) return;

      setRemoteLines(prev => {
        const updated = { ...prev };
        const current = updated[action.userId] || [];

        switch (action.type) {
          case 'pathStart':
            updated[action.userId] = [...current, action.path];
            break;
          case 'pathUpdate':
          case 'pathComplete': {
            const index = current.findIndex(p => p.id === action.path?.id);
            if (index !== -1) current[index] = action.path;
            else current.push(action.path);
            updated[action.userId] = [...current];
            break;
          }
          case 'clear':
            delete updated[action.userId];
            break;
        }
        return updated;
      });
    };

    socket.on('initialDrawingState', handleInitialState);
    socket.on('tintaUpdate', handleTintaUpdate);
    socket.on('drawingAction', handleDrawingAction);

    // Solicitar estado inicial al servidor
    socket.emit('requestDrawingState', { partidaId, equipoNumero, userId });

    return () => {
      socket.off('initialDrawingState', handleInitialState);
      socket.off('tintaUpdate', handleTintaUpdate);
      socket.off('drawingAction', handleDrawingAction);
    };
  }, [socket, partidaId, equipoNumero, userId]);

  // Función para actualizar tinta
  const updateTinta = (newTinta) => {
    if (isUpdatingTinta.current) return;
    
    newTinta = Math.max(0, Math.min(MAX_TINTA, newTinta));
    
    isUpdatingTinta.current = true;
    setTinta(newTinta);
    tintaConsumida.current = MAX_TINTA - newTinta;
    
    // Enviar al servidor
    if (socket) {
      socket.emit('updateTinta', {
        partidaId,
        equipoNumero,
        userId,
        tinta: newTinta
      });
    }
    
    isUpdatingTinta.current = false;
  };

  // Dibujar línea
  const drawLine = (point) => {
    if (!isDrawing.current || tinta <= 0) return;
    
    if (lastPoint.current) {
      const distance = Math.sqrt(
        Math.pow(point.x - lastPoint.current.x, 2) + 
        Math.pow(point.y - lastPoint.current.y, 2)
      );
      
      if (tintaConsumida.current + distance >= MAX_TINTA) {
        endDrawing();
        Swal.fire({
          title: '¡Sin tinta!',
          text: 'Debes limpiar tu dibujo para recargar.',
          icon: 'warning',
          timer: 1500,
          showConfirmButton: false
        });
        return;
      }
      
      tintaConsumida.current += distance;
      updateTinta(MAX_TINTA - tintaConsumida.current);
    }
    
    lastPoint.current = point;
    
    setLines(prevLines => {
      if (prevLines.length === 0) {
        const newLine = {
          points: [point.x, point.y],
          color: tool === 'eraser' ? '#ffffff' : color,
          strokeWidth: brushSize,
          userId,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        emitDrawingAction('pathStart', newLine);
        return [newLine];
      }
      
      const updatedLines = [...prevLines];
      const lastLine = updatedLines[updatedLines.length - 1];
      const updatedLine = {
        ...lastLine,
        points: [...lastLine.points, point.x, point.y]
      };
      
      updatedLines[updatedLines.length - 1] = updatedLine;
      
      if (updatedLine.points.length % 3 === 0) {
        emitDrawingAction('pathUpdate', updatedLine);
      }
      
      return updatedLines;
    });
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(() => {});
  };

  // Emitir acción de dibujo
  const emitDrawingAction = (type, line) => {
    if (!socket || !line) return;
    
    try {
      socket.emit('drawingAction', {
        partidaId,
        equipoNumero,
        userId,
        action: {
          type,
          path: {
            id: line.id,
            points: line.points || [],
            color: line.color || '#000000',
            strokeWidth: line.strokeWidth || 5
          }
        }
      });
    } catch (error) {
      console.error('Error emitting drawing action:', error);
    }
  };

  // Finalizar dibujo
  const endDrawing = () => {
    if (!isDrawing.current) return;
    
    isDrawing.current = false;
    lastPoint.current = null;
    
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
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
    if (!pos) return;
    
    isDrawing.current = true;
    startNewLine(pos);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (!point) return;
    
    drawLine(point);
  };

  const handleMouseUp = () => {
    endDrawing();
  };

  // Iniciar nuevo trazo
  const startNewLine = (pos) => {
    const newLine = {
      points: [pos.x, pos.y],
      color: tool === 'eraser' ? '#ffffff' : color,
      strokeWidth: brushSize,
      userId,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setLines(prevLines => [...prevLines, newLine]);
    return newLine;
  };

  // Limpiar dibujos
  const clearUserDrawing = () => {
    updateTinta(MAX_TINTA);
    
    setLines([]);
    
    if (socket) {
      socket.emit('drawingAction', {
        partidaId,
        equipoNumero,
        userId,
        action: {
          type: 'clear',
          tinta: MAX_TINTA
        }
      });
    }

    setRemoteLines(prev => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });

    Swal.fire({
      title: 'Dibujo borrado',
      text: 'Todos tus trazos han sido eliminados permanentemente',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // Manejo de herramientas y colores
  const handleColorSelect = (colorHex) => {
    setColor(colorHex);
    if (tool === 'eraser') setTool('brush');
    setShowColorPicker(false);
  };

  const toggleColorPicker = () => {
    setShowColorPicker(!showColorPicker);
  };

  const handleToolSelect = (selectedTool) => {
    setTool(selectedTool);
    if (selectedTool === 'eraser') {
      setLastColor(color);
      setColor('#ffffff');
    } else {
      setColor(lastColor);
    }
  };

  // Renderizado
  return (
    <div className="drawing-game-container">
      {/* Barra de herramientas */}
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
                    title={`Color ${index + 1}`}
                  />
                ))}
              </div>
            </div>
            <div className="custom-color-container">
              <button 
                className="color-picker-toggle"
                onClick={toggleColorPicker}
                style={{ backgroundColor: color }}
                title="Seleccionar color"
              />
              {showColorPicker && (
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="custom-color-picker-large"
                  onBlur={() => setShowColorPicker(false)}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Sección de herramientas */}
        <div className="tools-section-extended">                    
          <div className="tool-row">
            <button 
              className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
              onClick={() => handleToolSelect('brush')}
              title="Pincel"
            >
              <i className="fas fa-paint-brush"></i>
            </button>
            <button 
              className="tool-btn"
              onClick={clearUserDrawing}
              title="Limpiar mi dibujo"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
            
            {/* Indicador de tinta */}
            <div className="tinta-indicator">
              <div className="tinta-tank-vertical" style={{ height: '100px', width: '30px' }}>
                <div
                  className={`tinta-tank-fill ${
                    tinta <= 1000 ? 'tinta-tank-critical' : 
                    tinta <= 3000 ? 'tinta-tank-low' : ''
                  }`}
                  style={{ height: `${(tinta / MAX_TINTA) * 100}%` }}
                />
              </div>
              <span className="tinta-percentage">
                {Math.round((tinta / MAX_TINTA) * 100)}%
              </span>
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
            <span className="brush-size-label">{brushSize}px</span>
          </div>
        </div>
      </div>
      
      {/* Área de dibujo */}
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
            <Rect 
              width={800} 
              height={600} 
              fill="#ffffff" 
              listening={false} 
            />
            
            {/* Líneas remotas */}
            {Object.entries(remoteLines).flatMap(([userId, userLines]) =>
              Array.isArray(userLines)
                ? userLines
                    .filter(line => line?.points?.length > 1)
                    .map(line => (
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
                    ))
                : []
            )}

            {/* Líneas locales */}
            {lines.map((line) => (
              line?.points?.length > 1 && (
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