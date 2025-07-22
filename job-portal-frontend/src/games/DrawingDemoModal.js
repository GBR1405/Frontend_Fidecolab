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
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  // SOLO el profesor obtiene equipos e inicia la demo
  useEffect(() => {
    if (!socket || isNaN(numericPartidaId)) return;

    if (isProfessor) {
      socket.emit('getTeamsForPartida', numericPartidaId, (response) => {
        if (response.success) {
          const equiposOrdenados = [...response.equipos].sort((a, b) => a - b);
          setTeams(equiposOrdenados);

          // Inicia la demo con el primer equipo
          socket.emit('startDrawingDemo', numericPartidaId, (startResponse) => {
            if (!startResponse || startResponse.error) {
              console.error('Error al iniciar demostración', startResponse?.error);
              return;
            }
            // El evento drawingDemoStarted se encargará de establecer el estado
          });
        } else {
          setError(`Error obteniendo equipos: ${response.error || 'Desconocido'}`);
        }
      });
    }

    // Para estudiantes o reconexión
    socket.emit('checkDrawingDemo', numericPartidaId, (response) => {
      if (response.active) {
        setIsActive(true);
        setCurrentTeam(response.currentTeam);
      }
    });

    // Eventos compartidos
    socket.on('drawingDemoStarted', ({ currentTeam }) => {
      setIsActive(true);
      setCurrentTeam(currentTeam);
    });

    socket.on('drawingDemoTeamChanged', ({ currentTeam }) => {
      setCurrentTeam(currentTeam);
    });

    socket.on('drawingDemoEnded', () => {
      setIsActive(false);
      setCurrentTeam(null);
    });

    return () => {
      socket.off('drawingDemoStarted');
      socket.off('drawingDemoTeamChanged');
      socket.off('drawingDemoEnded');
    };
  }, [socket, numericPartidaId, isProfessor]);

  // Pedir y dibujar
  const fetchAndDrawTeamDrawing = () => {
    if (!socket || !currentTeam) return;

    setLoading(true);
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

    const scaleX = canvas.width / 800;
    const scaleY = canvas.height / 600;

    Object.values(drawingData).forEach(userPaths => {
      userPaths.forEach(path => {
        if (!Array.isArray(path.points) || path.points.length < 4) return;

        ctx.beginPath();
        ctx.strokeStyle = path.color || '#000000';
        ctx.lineWidth = path.strokeWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < path.points.length; i += 2) {
          const x = path.points[i] * scaleX;
          const y = path.points[i + 1] * scaleY;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
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

  // Redibuja al cambiar
  useEffect(() => {
    if (currentTeam !== null) {
      fetchAndDrawTeamDrawing();
    }
  }, [currentTeam]);

  useEffect(() => {
    if (!currentTeam) return;
    const interval = setInterval(fetchAndDrawTeamDrawing, 2000);
    return () => clearInterval(interval);
  }, [currentTeam]);

  const changeTeam = (direction) => {
    if (!isProfessor || !teams.length) return;

    const index = teams.indexOf(currentTeam);
    const newIndex = direction === 'next'
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
          <p>Equipo actual: {currentTeam}</p>
        </div>

        <div className="demo-body">
          {isProfessor && (
            <div className="teams-sidebar">
              {teams.map((team) => (
                <button
                  key={team}
                  className={`team-button ${team === currentTeam ? 'active' : ''}`}
                  onClick={() =>
                    socket.emit('changeDrawingDemoTeam', {
                      partidaId: numericPartidaId,
                      equipoNumero: team
                    })
                  }
                >
                  Equipo {team}
                </button>
              ))}
            </div>
          )}

          <div className="drawing-area">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="demo-drawing"
            />
            {isProfessor && (
              <div className="demo-controls">
                <button onClick={() => changeTeam('prev')}>Anterior</button>
                <button onClick={() => changeTeam('next')}>Siguiente</button>
              </div>
            )}
            {loading && <p className="demo-loading">Cargando dibujo...</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingDemoModal;
