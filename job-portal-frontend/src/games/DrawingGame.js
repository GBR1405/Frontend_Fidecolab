import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Stage, Layer, Line, Rect } from 'react-konva';
import Swal from 'sweetalert2';
import '../styles/drawingComponent.css';

const DrawingGame = ({ gameConfig, onGameComplete }) => {
  const { partidaId, equipoNumero } = useParams();
  const socket = useSocket();
  const stageRef = useRef(null);

  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('brush');
  const [lines, setLines] = useState([]);
  const [remoteLines, setRemoteLines] = useState({});
  const [tinta, setTinta] = useState(5000);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [lastColor, setLastColor] = useState('#000000');
  const [currentGameInfo, setCurrentGameInfo] = useState(null);

  const userId = localStorage.getItem('userId');
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  const animationRef = useRef(null);
  const tintaConsumida = useRef(0);
  const MAX_TINTA = 5000;

  const colorPalette = [
    '#FF0000', '#FF6600', '#FFCC00', '#FFFF00',
    '#00FF00', '#00CC33', '#006699', '#0000FF',
    '#6600FF', '#9933FF', '#FF00FF', '#FF33CC',
    '#000000', '#FFFFFF', '#888888'
  ];

  socket.emit('joinDrawingTeam', { partidaId, equipoNumero });

  useEffect(() => {
    if (!socket || !partidaId) return;
    socket.emit('getGameConfig', partidaId, (response) => {
      if (response.error) return;
      if (response.juegos?.length > 0) {
        const initialIndex = response.currentIndex || 0;
        const currentGame = response.juegos[initialIndex];
        if (currentGame && currentGame.tema) {
          setCurrentGameInfo({ tema: currentGame.tema });
        }
      }
    });
  }, [socket, partidaId]);

  useEffect(() => {
    try {
      const savedLines = localStorage.getItem(`lines-${partidaId}-${equipoNumero}-${userId}`);
      const savedTinta = localStorage.getItem(`tinta-${partidaId}-${equipoNumero}-${userId}`);
      if (savedLines) setLines(JSON.parse(savedLines));
      if (savedTinta) {
        const parsedTinta = parseInt(savedTinta);
        if (!isNaN(parsedTinta)) {
          setTinta(parsedTinta);
          tintaConsumida.current = MAX_TINTA - parsedTinta;
          socket.emit('updateTintaState', {
            partidaId,
            equipoNumero,
            userId,
            tinta: parsedTinta
          });
        }
      }
    } catch (error) {
      console.error('Error loading saved state:', error);
    }
  }, [partidaId, equipoNumero, userId, socket]);

  useEffect(() => {
    if (!socket) return;

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
            if (action.userId === userId) {
              socket.emit('initDrawingGame', { partidaId, equipoNumero, userId });
            }
            break;
        }

        return updated;
      });
    };

    const handleGameState = ({ actions, tintaState }) => {
      const grouped = {};
      actions?.forEach(({ userId, path }) => {
        if (!grouped[userId]) grouped[userId] = [];
        grouped[userId].push(path);
      });
      setRemoteLines(grouped);

      if (
        tintaState &&
        Object.keys(tintaState).length === 1 &&
        tintaState.hasOwnProperty(userId)
      ) {
        const parsed = parseInt(tintaState[userId]);
        if (!isNaN(parsed)) {
          const delta = tintaConsumida.current - (MAX_TINTA - parsed);
          if (Math.abs(delta) > 10) {
            tintaConsumida.current = MAX_TINTA - parsed;
            setTinta(parsed);
          }
        }
      }
    };

    socket.on('drawingAction', handleDrawingAction);
    socket.on('drawingGameState', handleGameState);
    socket.emit('initDrawingGame', { partidaId, equipoNumero, userId });

    return () => {
      socket.off('drawingAction', handleDrawingAction);
      socket.off('drawingGameState', handleGameState);
    };
  }, [socket, partidaId, equipoNumero, userId]);

  useEffect(() => {
    localStorage.setItem(
      `lines-${partidaId}-${equipoNumero}-${userId}`,
      JSON.stringify(lines)
    );
  }, [lines, partidaId, equipoNumero, userId]);

  useEffect(() => {
    localStorage.setItem(
      `tinta-${partidaId}-${equipoNumero}-${userId}`,
      tinta.toString()
    );
  }, [tinta, partidaId, equipoNumero, userId]);

  const handleColorSelect = (colorHex) => {
    setColor(colorHex);
    if (tool === 'eraser') setTool('brush');
    setShowColorPicker(false);
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
      const newTinta = MAX_TINTA - tintaConsumida.current;
      setTinta(newTinta);
    }

    lastPoint.current = point;

    setLines(prev => {
      if (prev.length === 0) {
        const newLine = startNewLine(point);
        emitDrawingAction('pathStart', newLine);
        return [newLine];
      }

      const updated = [...prev];
      const lastLine = updated[updated.length - 1];
      const updatedLine = {
        ...lastLine,
        points: [...lastLine.points, point.x, point.y]
      };

      updated[updated.length - 1] = updatedLine;

      if (updatedLine.points.length % 3 === 0) {
        emitDrawingAction('pathUpdate', updatedLine);
      }

      return updated;
    });
  };

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
          points: line.points || [],
          color: line.color || '#000000',
          strokeWidth: line.strokeWidth || 5
        }
      }
    });
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

    document.body.style.cursor = 'default';
  };

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

  const clearUserDrawing = () => {
    setLines([]);
    localStorage.removeItem(`lines-${partidaId}-${equipoNumero}-${userId}`);
    localStorage.setItem(`tinta-${partidaId}-${equipoNumero}-${userId}`, MAX_TINTA.toString());

    socket.emit('drawingAction', {
      partidaId,
      equipoNumero,
      userId,
      action: {
        type: 'clear',
        userId,
        tinta: MAX_TINTA,
        permanent: true
      }
    });

    setRemoteLines(prev => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });

    socket.emit('initDrawingGame', {
      partidaId,
      equipoNumero,
      userId
    });

    tintaConsumida.current = 0;
    setTinta(MAX_TINTA);

    Swal.fire({
      title: 'Dibujo borrado',
      text: 'Todos tus trazos han sido eliminados permanentemente',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  };

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
            onTouchCancel={handleMouseUp}
          >
            <Layer>
              <Rect width={800} height={600} fill="#ffffff" listening={false} />
              {Object.entries(remoteLines).flatMap(([userId, userLines]) =>
                Array.isArray(userLines)
                  ? userLines.filter(line => line?.points?.length > 1).map(line => (
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
              {lines.map((line, index) => (
                <Line
                  key={index}
                  points={line.points}
                  stroke={line.color}
                  strokeWidth={line.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={
                    line.color === '#ffffff' ? 'destination-out' : 'source-over'
                  }
                />
              ))}
            </Layer>
          </Stage>
        </div>

        <div className="toolbar">
          <button onClick={clearUserDrawing}>🧽 Borrar</button>
          <button onClick={() => handleToolSelect('brush')}>🖌️</button>
          <button onClick={() => handleToolSelect('eraser')}>🧼</button>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
          <button onClick={() => setShowColorPicker(!showColorPicker)}>🎨</button>
          {showColorPicker && (
            <div className="color-picker">
              {colorPalette.map((c, i) => (
                <div
                  key={i}
                  className="color-swatch"
                  style={{ backgroundColor: c }}
                  onClick={() => handleColorSelect(c)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="tinta-info">🖋 Tinta: {tinta.toFixed(0)} / {MAX_TINTA}</div>
      </div>
    </div>
  );
};

export default DrawingGame;
