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

  // Cargar equipos + estado de demostración
  useEffect(() => {
    if (!socket || isNaN(numericPartidaId)) return;

    socket.emit('getTeamsForPartida', numericPartidaId, (response) => {
      if (response.success) {
        const equiposOrdenados = response.equipos.sort((a, b) => a - b);
        setTeams(equiposOrdenados);

        socket.emit('checkDrawingDemo', numericPartidaId, (res) => {
          if (res.active) {
            setIsActive(true);
            setSelectedTeam(res.currentTeam);
          } else {
            if (equiposOrdenados.length > 0) {
              setSelectedTeam(equiposOrdenados[0]);
            }
          }
        });
      }
    });

    // Escuchar sincronizaciones
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

  // Solicitar dibujo
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

  // Dibujar en canvas
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
  const changeTeam = (direction) => {
    if (!isProfessor || teams.length === 0 || selectedTeam === null) return;

    const currentIndex = teams.indexOf(selectedTeam);
    let newIndex = direction === 'next'
      ? (currentIndex + 1) % teams.length
      : (currentIndex - 1 + teams.length) % teams.length;

    const newTeam = teams[newIndex];

    // Emitir cambio global
    socket.emit('changeDrawingDemoTeam', {
      partidaId: numericPartidaId,
      equipoNumero: newTeam
    });
  };

  // Seleccionar equipo desde la lista
  const selectTeam = (teamNumber) => {
    if (!isProfessor) return;
    
    socket.emit('changeDrawingDemoTeam', {
      partidaId: numericPartidaId,
      equipoNumero: teamNumber
    });
  };

  // Finalizar demostración
  const endDemo = () => {
    socket.on('drawingDemoEnded', () => {
    setIsActive(false);
    });
  };

  // Cargar canvas cuando cambia el equipo
  useEffect(() => {
    if (selectedTeam !== null) {
      fetchAndDrawTeamDrawing();
    }
  }, [selectedTeam]);

  // Actualización periódica
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

          <div className="teams-list-container">
            <h3>Equipos Participantes</h3>
            <ul className="teams-list">
              {teams.map(team => (
                <li 
                  key={team}
                  className={`team-item ${selectedTeam === team ? 'active' : ''}`}
                  onClick={() => selectTeam(team)}
                >
                  <span className="team-number">{team}</span>
                  Equipo {team}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {isProfessor && (
          <div className="demo-controls">
            <button onClick={() => changeTeam('prev')}>Anterior</button>
            <button 
              onClick={endDemo}
              className="demo-end-btn"
            >
              Finalizar Demostración
            </button>
            <button onClick={() => changeTeam('next')}>Siguiente</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingDemoModal;