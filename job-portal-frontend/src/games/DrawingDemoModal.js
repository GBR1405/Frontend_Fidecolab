import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import '../styles/DrawingDemoModal.css';

const DrawingDemoModal = ({ partidaId, isProfessor }) => {
  const socket = useSocket();
  const canvasRef = useRef(null);
  const numericPartidaId = Number(partidaId);

  const [teams, setTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Obtener lista de equipos y estado de demostración
  useEffect(() => {
    if (!socket || isNaN(numericPartidaId)) return;

    // Obtener equipos
    socket.emit('getTeamsForPartida', numericPartidaId, (response) => {
      if (response.success) {
        setTeams(response.equipos);
        if (response.equipos.length > 0) {
          setCurrentTeam(response.equipos[0]);
        }
      } else {
        setError(`Error obteniendo equipos: ${response.error || 'Desconocido'}`);
      }
    });

    // Obtener estado de demostración
    socket.emit('checkDrawingDemo', numericPartidaId, (response) => {
      if (response.active) {
        setIsActive(true);
        setCurrentTeam(response.currentTeam);
      }
    });

    // Eventos de sincronización
    socket.on('drawingDemoStarted', ({ currentTeam }) => {
      setIsActive(true);
      setCurrentTeam(currentTeam);
    });

    socket.on('drawingDemoTeamChanged', ({ currentTeam }) => {
      setCurrentTeam(currentTeam);
    });

    socket.on('drawingDemoEnded', () => {
      setIsActive(false);
    });

    return () => {
      socket.off('drawingDemoStarted');
      socket.off('drawingDemoTeamChanged');
      socket.off('drawingDemoEnded');
    };
  }, [socket, numericPartidaId]);

  // Cargar y dibujar el canvas
  const fetchAndDrawTeamDrawing = () => {
    if (!socket || !currentTeam) return;

    setLoading(true);
    setError(null);

    socket.emit('professorGetTeamDrawing', {
      partidaId: numericPartidaId,
      equipoNumero: currentTeam
    }, (response) => {
      setLoading(false);
      if (response.success) {
        drawCanvas(response.drawing);
        setLastUpdate(new Date());
      } else {
        clearCanvas();
      }
    });
  };

  const drawCanvas = (drawingData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!drawingData) return;

    const sourceWidth = 800;
    const sourceHeight = 600;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const scaleX = canvasWidth / sourceWidth;
    const scaleY = canvasHeight / sourceHeight;

    Object.values(drawingData).forEach((userPaths) => {
      userPaths.forEach((path) => {
        if (!Array.isArray(path.points) || path.points.length < 4) return;

        ctx.beginPath();
        ctx.strokeStyle = path.color || '#000000';
        ctx.lineWidth = path.strokeWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < path.points.length; i += 2) {
          const x = path.points[i] * scaleX;
          const y = path.points[i + 1] * scaleY;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      });
    });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Redibuja al cambiar equipo
  useEffect(() => {
    if (currentTeam !== null) {
      fetchAndDrawTeamDrawing();
    }
  }, [currentTeam]);

  // Actualización periódica
  useEffect(() => {
    if (!currentTeam) return;
    const intervalId = setInterval(() => {
      fetchAndDrawTeamDrawing();
    }, 2000);

    return () => clearInterval(intervalId);
  }, [currentTeam]);

  // Cambiar equipo (solo profesor)
  const changeTeam = (direction) => {
    if (!isProfessor || !teams.length) return;

    const index = teams.indexOf(currentTeam);
    let newIndex = direction === 'next'
      ? (index + 1) % teams.length
      : (index - 1 + teams.length) % teams.length;

    const newTeam = teams[newIndex];

    socket.emit('changeDrawingDemoTeam', {
      partidaId: numericPartidaId,
      equipoNumero: newTeam
    });
  };

  if (!isActive) return null;

  return (
    <div className="demo-modal-overlay">
      <div className="demo-modal-container">
        <div className="demo-header">
          <h2>Modo Demostración</h2>
        </div>

        <div className="demo-content">
          <div className="demo-drawing-container">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="demo-drawing"
            />
            <div className="team-indicator">
              Equipo actual: {currentTeam}
            </div>
            {loading && <p className="demo-loading">Cargando dibujo...</p>}
          </div>

          {isProfessor && (
            <div className="demo-controls">
              <button onClick={() => changeTeam('prev')}>Anterior</button>
              <button onClick={() => changeTeam('next')}>Siguiente</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrawingDemoModal;
