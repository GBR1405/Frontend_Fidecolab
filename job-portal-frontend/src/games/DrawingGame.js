import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Stage, Layer, Line, Rect } from 'react-konva';
import Swal from 'sweetalert2';
import '../styles/games.css';

const DrawingGame = ({ gameConfig, onGameComplete }) => {
  // Parámetros de la URL y contexto
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

  // Paleta de colores
  const colorPalette = [
    '#FF0000', '#FF3300', '#FF6600', '#FF9900', '#FFCC00', '#FFFF00',
    '#00FF00', '#00CC33', '#009966', '#006699', '#0033CC', '#0000FF',
    '#6600FF', '#9933FF', '#CC66FF', '#FF00FF', '#FF33CC', '#FF6699',
    '#000000', '#FFFFFF', '#888888'
  ];

 socket.emit('joinDrawingTeam', { partidaId, equipoNumero });

  // Cargar estado inicial desde localStorage
  useEffect(() => {
    const loadSavedState = () => {
      try {
        const savedLines = localStorage.getItem(`lines-${partidaId}-${equipoNumero}-${userId}`);
        const savedTinta = localStorage.getItem(`tinta-${partidaId}-${equipoNumero}-${userId}`);
        
        if (savedLines) {
          const parsedLines = JSON.parse(savedLines);
          if (Array.isArray(parsedLines)) {
            setLines(parsedLines);
          }
        }
        
        if (savedTinta) {
          const parsedTinta = parseInt(savedTinta);
          if (!isNaN(parsedTinta)) {
            setTinta(parsedTinta);
            tintaConsumida.current = MAX_TINTA - parsedTinta;
          }
        }
      } catch (error) {
        console.error('Error loading saved state:', error);
      }
    };

    loadSavedState();
  }, [partidaId, equipoNumero, userId]);

  // Guardar líneas en localStorage cuando cambian
  useEffect(() => {
    const saveLines = () => {
      try {
        localStorage.setItem(
          `lines-${partidaId}-${equipoNumero}-${userId}`, 
          JSON.stringify(lines)
        );
      } catch (error) {
        console.error('Error saving lines:', error);
      }
    };

    saveLines();
  }, [lines, partidaId, equipoNumero, userId]);

  // Guardar tinta en localStorage cuando cambia
  useEffect(() => {
    const saveTinta = () => {
      try {
        localStorage.setItem(
          `tinta-${partidaId}-${equipoNumero}-${userId}`, 
          tinta.toString()
        );
      } catch (error) {
        console.error('Error saving tinta:', error);
      }
    };

    saveTinta();
  }, [tinta, partidaId, equipoNumero, userId]);

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

  // Dibujar línea
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
      const newTinta = MAX_TINTA - tintaConsumida.current;
      setTinta(newTinta);
    }
    
    lastPoint.current = point;
    
    // Actualizar última línea
    setLines(prevLines => {
      if (prevLines.length === 0) {
        const newLine = startNewLine(point);
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
    
    // Renderizado optimizado
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(() => {});
  };

  useEffect(() => {
  if (!socket) return;

  // Función para manejar acciones remotas en tiempo real
  const handleRemoteAction = (action) => {
    if (!action || action.userId === userId) return;

    setRemoteLines(prev => {
      const newRemoteLines = {...prev};
      
      switch (action.type) {
        case 'pathStart':
          newRemoteLines[action.userId] = [...(newRemoteLines[action.userId] || []), action.path];
          break;
          
        case 'pathUpdate':
          if (newRemoteLines[action.userId]) {
            const index = newRemoteLines[action.userId].findIndex(l => l.id === action.path?.id);
            if (index >= 0 && action.path) {
              newRemoteLines[action.userId][index] = action.path;
            }
          }
          break;
          
        case 'pathComplete':
          if (newRemoteLines[action.userId]) {
            const index = newRemoteLines[action.userId].findIndex(l => l.id === action.path?.id);
            if (index >= 0 && action.path) {
              newRemoteLines[action.userId][index] = action.path;
            }
          }
          break;
          
        case 'clear':
          delete newRemoteLines[action.userId];
          break;
      }
      
      return newRemoteLines;
    });
  };

  // Función para sincronización inicial
  const handleSyncResponse = ({ actions }) => {
    const syncedLines = {};
    actions?.forEach(({ userId, path }) => {
      if (userId && path) {
        syncedLines[userId] = [...(syncedLines[userId] || []), path];
      }
    });
    setRemoteLines(syncedLines);
  };

  // Configurar listeners
  socket.on('drawingAction', handleRemoteAction);
  socket.on('drawingSyncResponse', handleSyncResponse);

  // Solicitar sincronización inicial
  socket.emit('requestDrawingSync', { partidaId, equipoNumero, userId });

  return () => {
    socket.off('drawingAction', handleRemoteAction);
    socket.off('drawingSyncResponse', handleSyncResponse);
  };
}, [socket, partidaId, equipoNumero, userId]);

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

  // Limpiar dibujos
  const clearUserDrawing = () => {
  // Limpiar estado local
  setLines([]);
  
  // Limpiar localStorage completamente
  localStorage.removeItem(`lines-${partidaId}-${equipoNumero}-${userId}`);
  localStorage.setItem(`tinta-${partidaId}-${equipoNumero}-${userId}`, MAX_TINTA.toString());

  // Notificar al servidor para borrado permanente
  socket.emit('drawingAction', {
    partidaId,
    equipoNumero,
    userId,
    action: {
      type: 'clear',
      userId,
      tinta: MAX_TINTA,
      permanent: true // Marcar como borrado permanente
    }
  });

  // Resetear estado de tinta
  tintaConsumida.current = 0;
  setTinta(MAX_TINTA);

  // Feedback visual
  Swal.fire({
    title: 'Dibujo borrado',
    text: 'Todos tus trazos han sido eliminados permanentemente',
    icon: 'success',
    timer: 1500,
    showConfirmButton: false
  });
};

  // Configuración de Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleDrawingAction = (action) => {
      if (!action || action.userId === userId) return;

      setRemoteLines(prev => {
        const newRemoteLines = { ...prev };
        
        try {
          switch (action.type) {
            case 'pathStart':
              if (!newRemoteLines[action.userId]) {
                newRemoteLines[action.userId] = [];
              }
              if (action.path) {
                newRemoteLines[action.userId].push(action.path);
              }
              break;
              
            case 'pathUpdate':
            case 'pathComplete':
              if (Array.isArray(newRemoteLines[action.userId])) {
                const index = newRemoteLines[action.userId].findIndex(
                  line => line.id === action.path?.id
                );
                if (index >= 0 && action.path) {
                  newRemoteLines[action.userId][index] = action.path;
                }
              }
              break;
              
            case 'clear':
              if (newRemoteLines[action.userId]) {
                delete newRemoteLines[action.userId];
              }
              break;
          }
        } catch (error) {
          console.error('Error processing drawing action:', error);
        }
        
        return newRemoteLines;
      });
    };

    const handleGameState = (data) => {
      if (!data) return;

      const newRemoteLines = {};
      
      try {
        if (Array.isArray(data.actions)) {
          data.actions.forEach(({ userId, path }) => {
            if (userId && path) {
              if (!newRemoteLines[userId]) {
                newRemoteLines[userId] = [];
              }
              newRemoteLines[userId].push(path);
            }
          });
        }
        
        setRemoteLines(newRemoteLines);
        
        if (data.tintaState?.[userId]) {
          const newTinta = parseInt(data.tintaState[userId]);
          if (!isNaN(newTinta)) {
            setTinta(newTinta);
            tintaConsumida.current = MAX_TINTA - newTinta;
          }
        }
      } catch (error) {
        console.error('Error processing game state:', error);
      }
    };

    socket.on('drawingAction', handleDrawingAction);
    socket.on('drawingGameState', handleGameState);
    
    // Solicitar estado inicial
    socket.emit('initDrawingGame', { 
      partidaId, 
      equipoNumero, 
      userId 
    });

    return () => {
      socket.off('drawingAction', handleDrawingAction);
      socket.off('drawingGameState', handleGameState);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [socket, partidaId, equipoNumero, userId]);

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
              className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => handleToolSelect('eraser')}
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