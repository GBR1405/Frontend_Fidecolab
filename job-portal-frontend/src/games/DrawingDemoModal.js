import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import '../styles/DrawingDemoModal.css';

const DrawingDemoModal = ({ partidaId, isProfessor }) => {
  const socket = useSocket();
  const canvasRef = useRef(null);
  const numericPartidaId = Number(partidaId);

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Obtener equipos + estado de demo
  useEffect(() => {
    if (!socket || isNaN(numericPartidaId)) return;

    socket.emit('getTeamsForPartida', numericPartidaId, (response) => {
      if (response.success) {
        const ordenados = response.equipos.sort((a, b) => a - b);
        setTeams(ordenados);

        socket.emit('checkDrawingDemo', numericPartidaId, (res) => {
          if (res.active) {
            setIsActive(true);
            setSelectedTeam(res.currentTeam);
          } else {
            if (ordenados.length > 0) {
              setSelectedTeam(ordenados[0]);
            }
          }
        });
      }
    });

    socket.on('drawingDemoStarted', ({ currentTeam }) => {
      setIsActive(true);
      setSelectedTeam(currentTeam);
    });

    socket.on('drawingDemoTeamChanged', ({ currentTeam }) => {
      setSelectedTeam(currentTeam);
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

  // Obtener y renderizar dibujo
  const fetchAndDrawTeamDrawing = () => {
    if (!socket || selectedTeam === null) return;

    setLoading(true);

    socket.emit('professorGetTeamDrawing', {
      partidaId: numericPartidaId,
      equipoNumero: selectedTeam
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

  // Cambiar equipo (solo profesor)
  const selectTeam = (teamNumber) => {
    if (!isProfessor) return;
    socket.emit('changeDrawingDemoTeam', {
      partidaId: numericPartidaId,
      equipoNumero: teamNumber
    });
  };

  // Finalizar demo (solo profesor)
  const endDemo = () => {
    socket.emit('endDrawingDemo', numericPartidaId);
  };

  useEffect(() => {
    if (selectedTeam !== null) {
      fetchAndDrawTeamDrawing();
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (!selectedTeam) return;
    const intervalId = setInterval(() => {
      fetchAndDrawTeamDrawing();
    }, 2000);
    return () => clearInterval(intervalId);
  }, [selectedTeam]);

  if (!isActive && !isProfessor) return null;

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
              Equipo actual: {selectedTeam}
            </div>
            {loading && <p className="demo-loading">Cargando dibujo...</p>}
          </div>

          {isProfessor ? (
            <div className="teams-list-container">
              <h3>Equipos Participantes</h3>
              <ul className="teams-list">
                {teams.map(team => (
                  <li
                    key={team}
                    className={`team-item ${selectedTeam === team ? 'active' : ''}`}
                    onClick={() => selectTeam(team)}
                  >
                    <span className="team-number">Equipo {team}</span>
                    <span className="team-votes"> (0 votos)</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="student-extra-container">
              <div className="most-voted-section">
                <h4>Equipo más votado</h4>
                <p>Equipo N</p>
              </div>
              <div className="student-actions">
                <button className="vote-button">Votar</button>
                <button className="star-button">⭐</button>
                <button className="download-button">Descargar</button>
              </div>
            </div>
          )}
        </div>

        {isProfessor && (
          <div className="demo-controls">
            <button onClick={endDemo} className="demo-end-btn">
              Finalizar Demostración
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingDemoModal;
