import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Stage, Layer, Line, Rect } from 'react-konva';
import Swal from 'sweetalert2';
import '../styles/drawingComponent.css';

const DrawingGame = ({ gameConfig, onGameComplete }) => {
  // Constantes
  const MAX_INK = 5000;
  const INK_RESET_COOLDOWN = 1000; // 1 segundo entre resets

  // Parámetros y conexión
  const { partidaId, equipoNumero } = useParams();
  const socket = useSocket();
  const stageRef = useRef(null);
  
  // Estados del dibujo
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('brush');
  const [lines, setLines] = useState([]);
  const [remoteLines, setRemoteLines] = useState({});
  const [ink, setInk] = useState(MAX_INK);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [lastColor, setLastColor] = useState('#000000');
  const [currentGameInfo, setCurrentGameInfo] = useState(null);
  
  // Referencias
  const userId = localStorage.getItem('userId');
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  const animationRef = useRef(null);
  const inkConsumed = useRef(0);
  const isResetting = useRef(false);
  const lastActionTime = useRef(Date.now());

  // Paleta de colores
  const colorPalette = [
    '#FF0000', '#FF6600', '#FFCC00', '#FFFF00',
    '#00FF00', '#00CC33', '#006699', '#0000FF',
    '#6600FF', '#9933FF', '#FF00FF', '#FF33CC',
    '#000000', '#FFFFFF', '#888888'
  ];

  // Efecto inicial - Conexión y carga de estado
  useEffect(() => {
    if (!socket || !partidaId) return;

    socket.emit('joinDrawingTeam', { partidaId, equipoNumero });

    // Cargar estado guardado
    const loadSavedState = () => {
      try {
        const savedLines = localStorage.getItem(`lines-${partidaId}-${equipoNumero}-${userId}`);
        const savedInk = localStorage.getItem(`ink-${partidaId}-${equipoNumero}-${userId}`);
        
        if (savedLines) {
          const parsedLines = JSON.parse(savedLines);
          if (Array.isArray(parsedLines)) {
            setLines(parsedLines);
          }
        }
        
        if (savedInk) {
          const parsedInk = parseInt(savedInk);
          if (!isNaN(parsedInk)) {
            setInk(parsedInk);
            inkConsumed.current = MAX_INK - parsedInk;
          }
        }
      } catch (error) {
        console.error('Error loading saved state:', error);
      }
    };

    loadSavedState();

    // Obtener configuración del juego
    socket.emit('getGameConfig', partidaId, (response) => {
      if (response?.juegos?.length > 0) {
        const currentGame = response.juegos[response.currentIndex || 0];
        if (currentGame?.tema) {
          setCurrentGameInfo({ tema: currentGame.tema });
        }
      }
    });
  }, [socket, partidaId, equipoNumero, userId]);

  // Manejadores de eventos del socket
  useEffect(() => {
    if (!socket) return;

    const handleInkUpdate = ({ userId: updatedUserId, ink: newInk }) => {
      if (updatedUserId !== userId) return;
      
      const now = Date.now();
      if (now <= lastActionTime.current) return;

      lastActionTime.current = now;
      inkConsumed.current = MAX_INK - newInk;
      setInk(newInk);
      localStorage.setItem(`ink-${partidaId}-${equipoNumero}-${userId}`, newInk.toString());
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

    const handleDrawingCleared = ({ userId: clearedUserId }) => {
      if (clearedUserId === userId) return;
      
      setRemoteLines(prev => {
        const updated = { ...prev };
        delete updated[clearedUserId];
        return updated;
      });
    };

    socket.on('inkUpdate', handleInkUpdate);
    socket.on('drawingAction', handleDrawingAction);
    socket.on('userDrawingCleared', handleDrawingCleared);

    return () => {
      socket.off('inkUpdate', handleInkUpdate);
      socket.off('drawingAction', handleDrawingAction);
      socket.off('userDrawingCleared', handleDrawingCleared);
    };
  }, [socket, userId, partidaId, equipoNumero]);

  // Guardar líneas en localStorage cuando cambian
  useEffect(() => {
    localStorage.setItem(
      `lines-${partidaId}-${equipoNumero}-${userId}`,
      JSON.stringify(lines)
    );
  }, [lines, partidaId, equipoNumero, userId]);

  // Guardar tinta en localStorage cuando cambia
  useEffect(() => {
    localStorage.setItem(
      `ink-${partidaId}-${equipoNumero}-${userId}`,
      ink.toString()
    );
  }, [ink, partidaId, equipoNumero, userId]);

  // Manejo de herramientas
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

  // Funciones de dibujo
  const startNewLine = (pos) => {
    const newLine = {
      points: [pos.x, pos.y],
      color: tool === 'eraser' ? '#ffffff' : color,
      strokeWidth: brushSize,
      userId,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setLines(prev => [...prev, newLine]);
    return newLine;
  };

  const drawLine = (point) => {
    if (!isDrawing.current || ink <= 0) return;
    
    // Calcular consumo de tinta
    if (lastPoint.current) {
      const distance = Math.sqrt(
        Math.pow(point.x - lastPoint.current.x, 2) + 
        Math.pow(point.y - lastPoint.current.y, 2)
      );
      
      if (inkConsumed.current + distance >= MAX_INK) {
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
      
      inkConsumed.current += distance;
      const newInk = MAX_INK - inkConsumed.current;
      setInk(newInk);
    }
    
    lastPoint.current = point;
    
    // Actualizar última línea
    setLines(prev => {
      if (prev.length === 0) {
        const newLine = startNewLine(point);
        emitDrawingAction('pathStart', newLine);
        return [newLine];
      }
      
      const updatedLines = [...prev];
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

  // Emitir acciones de dibujo
  const emitDrawingAction = (type, line) => {
    if (!socket || !line) return;
    
    socket.emit('drawingAction', {
      partidaId,
      equipoNumero,
      userId,
      action: {
        type,
        path: {
          id: line.id,
          points: line.points,
          color: line.color || '#000000',
          strokeWidth: line.strokeWidth || 5
        }
      }
    });
  };

  // Limpiar dibujo del usuario actual
  const clearUserDrawing = () => {
    if (isResetting.current) return;
    isResetting.current = true;

    // Optimistic UI update
    setInk(MAX_INK);
    inkConsumed.current = 0;
    setLines([]);
    localStorage.setItem(`ink-${partidaId}-${equipoNumero}-${userId}`, MAX_INK.toString());
    localStorage.removeItem(`lines-${partidaId}-${equipoNumero}-${userId}`);

    // Notificar al servidor
    socket.emit('drawingAction', {
      partidaId,
      equipoNumero,
      userId,
      action: {
        type: 'clear',
        timestamp: Date.now()
      }
    }, (response) => {
      isResetting.current = false;
      
      if (response?.error) {
        // Rollback en caso de error
        const savedInk = parseInt(localStorage.getItem(`ink-${partidaId}-${equipoNumero}-${userId}`)) || 0;
        setInk(savedInk);
        inkConsumed.current = MAX_INK - savedInk;
        
        Swal.fire({
          title: 'Error',
          text: response.error,
          icon: 'error',
          timer: 2000
        });
      } else {
        Swal.fire({
          title: '¡Tinta recargada!',
          icon: 'success',
          timer: 1000,
          showConfirmButton: false
        });
      }
    });
  };

  // Eventos del mouse/touch
  const handleMouseDown = (e) => {
    if (ink <= 0) return;
    
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

  // Renderizado
  return (
    <div className="drawing__container">
      <div className="container__canvas">
        <div className="canvas__drawing">
          <Stage
            width={800}
            height={600}
            ref={stageRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <Layer>
              <Rect width={800} height={600} fill="#ffffff" listening={false} />

              {Object.entries(remoteLines).flatMap(([userId, userLines]) =>
                userLines?.filter(line => line?.points?.length > 1).map(line => (
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
              )}

              {lines.map(line => (
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

      <div className="details__group">
        <p>Número de grupo</p>
        <span>{equipoNumero}</span>
      </div>

      <div className="container__theme">
        <div className="container__header">
          <h3>Tema:</h3>
        </div>
        <div className="container__body">
          <span>{currentGameInfo?.tema || 'Sin tema'}</span>
        </div>
      </div>

      <div className="drawing__tools">
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
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="custom-color-picker-large"
              />
            </div>
          </div>
        </div>

        <div className="tools__section">
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
            disabled={isResetting.current}
            title="Limpiar mi dibujo"
          >
            {isResetting.current ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-trash-alt"></i>
            )}
          </button>

          <div className="ink__tank">
            <div
              className={`tank__fill ${
                ink <= 1000 ? 'tank__critical' : 
                ink <= 3000 ? 'tank__low' : ''
              }`}
              style={{ height: `${(ink / MAX_INK) * 100}%` }}
            />
          </div>
        </div>

        <div className="size__controls">
          <input
            type="range"
            min="1"
            max="30"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="size__slider"
          />
          <span className="brush-size-label">{brushSize}px</span>
        </div>
      </div>
    </div>
  );
};

export default DrawingGame;