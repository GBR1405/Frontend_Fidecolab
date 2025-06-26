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
  const lines = useRef([]);
  const remoteLines = useRef({});
  const [tinta, setTinta] = useState(() => {
    const savedTinta = localStorage.getItem(`tinta-${partidaId}-${equipoNumero}-${userId}`);
    return savedTinta ? parseInt(savedTinta) : 5000;
  });
  const tintaConsumida = useRef(5000 - (localStorage.getItem(`tinta-${partidaId}-${equipoNumero}-${userId}`) ? parseInt(localStorage.getItem(`tinta-${partidaId}-${equipoNumero}-${userId}`)) : 5000));
  const MAX_TINTA = 5000;
  const lastPoint = useRef(null);
  const animationRef = useRef(null);
  const pendingUpdates = useRef({});

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
    lines.current = [...lines.current, newLine];
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
      startNewLine(point);
    } else {
      const lastLine = lines.current[lines.current.length - 1];
      lastLine.points = [...lastLine.points, point.x, point.y];
      
      // Enviar actualización optimizada
      if (lastLine.points.length % 3 === 0) { // Enviar cada 3 puntos
        socket.emit('drawingAction', {
          partidaId,
          equipoNumero,
          userId,
          action: {
            type: 'pathUpdate',
            path: {
              id: lastLine.id,
              points: lastLine.points,
              color: lastLine.color,
              strokeWidth: lastLine.strokeWidth
            }
          }
        });
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

  // Finalizar dibujo
  const endDrawing = () => {
    if (!isDrawing.current) return;
    
    isDrawing.current = false;
    lastPoint.current = null;
    
    if (lines.current.length > 0) {
      const lastLine = lines.current[lines.current.length - 1];
      socket.emit('drawingAction', {
        partidaId,
        equipoNumero,
        userId,
        action: {
          type: 'pathComplete',
          path: {
            id: lastLine.id,
            points: lastLine.points,
            color: lastLine.color,
            strokeWidth: lastLine.strokeWidth
          }
        }
      });
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
    
    socket.emit('drawingAction', {
      partidaId,
      equipoNumero,
      userId,
      action: {
        type: 'pathStart',
        path: {
          id: lines.current[lines.current.length - 1].id,
          color: tool === 'eraser' ? '#ffffff' : color,
          strokeWidth: brushSize
        }
      }
    });
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
    lines.current = [];
    
    // Limpiar también del estado remoto
    socket.emit('drawingAction', {
      partidaId,
      equipoNumero,
      userId,
      action: { type: 'clear', userId }
    });

    tintaConsumida.current = 0;
    const newTinta = MAX_TINTA;
    setTinta(newTinta);
    persistTinta(newTinta);

    Swal.fire({
      title: 'Tinta recargada',
      text: '¡Puedes volver a dibujar!',
      icon: 'success',
      timer: 1000,
      showConfirmButton: false
    });
  };

  // Configuración de Socket.io
  useEffect(() => {
    if (!socket) return;

    // Procesar actualizaciones remotas optimizadas
    const processRemoteUpdates = () => {
      const now = Date.now();
      const updatesToProcess = Object.entries(pendingUpdates.current)
        .filter(([_, update]) => now - update.timestamp < 1000); // Procesar solo actualizaciones recientes

      updatesToProcess.forEach(([userId, { lines: userLines }]) => {
        remoteLines.current[userId] = userLines;
      });

      if (updatesToProcess.length > 0) {
        forceUpdate({});
      }
      
      pendingUpdates.current = {};
    };

    // Escuchar acciones remotas
    socket.on('drawingAction', (action) => {
      if (action.userId === userId) return;

      const now = Date.now();
      
      if (action.type === 'pathStart') {
        if (!pendingUpdates.current[action.userId]) {
          pendingUpdates.current[action.userId] = { lines: [], timestamp: now };
        }
        pendingUpdates.current[action.userId].lines.push({
          ...action.path,
          points: []
        });
      }
      else if (action.type === 'pathUpdate') {
        if (!pendingUpdates.current[action.userId]) {
          pendingUpdates.current[action.userId] = { lines: [], timestamp: now };
        }
        
        const userLines = pendingUpdates.current[action.userId].lines;
        const existingLine = userLines.find(line => line.id === action.path.id);
        
        if (existingLine) {
          existingLine.points = action.path.points;
        } else {
          userLines.push(action.path);
        }
        
        pendingUpdates.current[action.userId].timestamp = now;
      }
      else if (action.type === 'pathComplete') {
        if (!pendingUpdates.current[action.userId]) {
          pendingUpdates.current[action.userId] = { lines: [], timestamp: now };
        }
        
        const userLines = pendingUpdates.current[action.userId].lines;
        const existingLine = userLines.find(line => line.id === action.path.id);
        
        if (existingLine) {
          existingLine.points = action.path.points;
        } else {
          userLines.push(action.path);
        }
      }
      else if (action.type === 'clear') {
        remoteLines.current[action.userId] = [];
        forceUpdate({});
      }

      // Procesar actualizaciones cada 100ms para mejor rendimiento
      setTimeout(processRemoteUpdates, 100);
    });

  

    socket.emit('initDrawingGame', { partidaId, equipoNumero });

    socket.on('drawingGameState', ({ actions, tintaState }) => {
      remoteLines.current = {};
      actions.forEach(action => {
        if (!remoteLines.current[action.userId]) {
          remoteLines.current[action.userId] = [];
        }
        remoteLines.current[action.userId].push(action.path);
      });
      
      if (tintaState && tintaState[userId]) {
        setTinta(tintaState[userId]);
        tintaConsumida.current = MAX_TINTA - tintaState[userId];
        persistTinta(tintaState[userId]);
      }
      
      forceUpdate({});
    });

    // Configurar cursor
    if (stageRef.current) {
      const container = stageRef.current.container();
      container.style.cursor = 'crosshair';
    }

    return () => {
      socket.off('drawingAction');
      socket.off('drawingDemoStarted');
      socket.off('drawingGameState');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [socket, partidaId, equipoNumero, userId]);

  // ... (resto del componente, incluyendo renderizado y controles UI)

  return (
    <div className="drawing-game-container">
      {/* Controles de herramientas (igual que antes) */}
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
            <Rect width={800} height={600} fill="#ffffff" listening={false} />
            
            {/* Líneas remotas optimizadas */}
            {Object.entries(remoteLines.current).map(([userId, userLines]) => (
              userLines.map((line, i) => (
                line?.points?.length > 0 && (
                  <Line
                    key={`remote-${userId}-${line.id || i}`}
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
            {lines.current.map((line, i) => (
              line?.points?.length > 0 && (
                <Line
                  key={`local-${line.id || i}`}
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