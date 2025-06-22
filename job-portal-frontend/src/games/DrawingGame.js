
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const DrawingGame = ({ gameConfig, onGameComplete }) => {
  const { partidaId, equipoNumero } = useParams();
  const socket = useSocket();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('brush');
  const [userDrawings, setUserDrawings] = useState({});
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (!socket || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    socket.emit('initDrawingGame', { partidaId, equipoNumero });

    socket.on('drawingAction', handleRemoteAction);

    socket.on('drawingGameState', ({ actions }) => {
      const grouped = {};
      actions.forEach(action => {
        if (!grouped[action.userId]) grouped[action.userId] = [];
        grouped[action.userId].push(action);
      });
      setUserDrawings(grouped);
      setTimeout(() => redrawCanvas(grouped), 0);
    });

    socket.on('drawingCleared', ({ userId: clearedUserId }) => {
      setUserDrawings(prev => {
        const updated = { ...prev };
        delete updated[clearedUserId];
        setTimeout(() => redrawCanvas(updated), 0);
        return updated;
      });
    });

    return () => {
      socket.off('drawingAction', handleRemoteAction);
      socket.off('drawingGameState');
      socket.off('drawingCleared');
    };
  }, [socket]);

  const handleRemoteAction = (action) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { userId } = action;

    // Guardar acción
    setUserDrawings(prev => {
      const prevActions = prev[userId] || [];
      return {
        ...prev,
        [userId]: [...prevActions, action]
      };
    });

    // Dibujar acción
    switch (action.type) {
      case 'start':
        ctx.beginPath();
        ctx.moveTo(action.x * canvas.width, action.y * canvas.height);
        break;
      case 'draw':
        ctx.lineTo(action.x * canvas.width, action.y * canvas.height);
        ctx.strokeStyle = action.color;
        ctx.lineWidth = action.size;
        ctx.stroke();
        break;
      case 'fill':
        ctx.fillStyle = action.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
    }
  };

  const redrawCanvas = (drawings = userDrawings) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    Object.values(drawings).forEach(actions => {
      let drawing = false;
      actions.forEach(action => {
        switch (action.type) {
          case 'start':
            ctx.beginPath();
            ctx.moveTo(action.x * canvas.width, action.y * canvas.height);
            drawing = true;
            break;
          case 'draw':
            if (!drawing) return;
            ctx.lineTo(action.x * canvas.width, action.y * canvas.height);
            ctx.strokeStyle = action.color;
            ctx.lineWidth = action.size;
            ctx.stroke();
            break;
          case 'fill':
            ctx.fillStyle = action.color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
        }
      });
    });
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;

    setIsDrawing(true);

    const action = { type: 'start', x, y, color, size: brushSize, userId };
    socket.emit('drawingAction', { partidaId, equipoNumero, userId, action });
    handleRemoteAction(action);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;

    const action = {
      type: 'draw',
      x,
      y,
      color: tool === 'eraser' ? '#FFFFFF' : color,
      size: brushSize,
      userId
    };
    socket.emit('drawingAction', { partidaId, equipoNumero, userId, action });
    handleRemoteAction(action);
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    socket.emit('clearMyDrawing', { partidaId, equipoNumero, userId });
  };

  return (
    <div className="drawing-container">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        style={{ border: '1px solid black', background: '#fff' }}
      />
      <button onClick={clearCanvas}>Borrar mi dibujo</button>
    </div>
  );
};

export default DrawingGame;
