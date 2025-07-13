import React, { useEffect, useRef, useState } from 'react';
import "../styles/LiveViewDrawings.css";

const ProfessorDrawingViewer = ({ partidaId, socket }) => {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  const numericPartidaId = Number(partidaId);

  // Obtener lista de equipos
  useEffect(() => {
    if (isNaN(numericPartidaId)) {
      setError('ID de partida inválido');
      return;
    }

    if (!socket) {
      setError('Socket no disponible');
      return;
    }

    socket.emit('getTeamsForPartida', numericPartidaId, (response) => {
      if (response.success) {
        setTeams(response.equipos);
        if (response.equipos.length > 0) {
          setSelectedTeam(response.equipos[0]);
        }
      } else {
        setError(`Error obteniendo equipos: ${response.error || 'Desconocido'}`);
      }
    });
  }, [socket, numericPartidaId]);

  // Solicitar dibujo
  const fetchAndDrawTeamDrawing = () => {
    if (!socket || !selectedTeam) return;

    setLoading(true);
    setError(null);

    socket.emit(
      'professorGetTeamDrawing',
      { partidaId: numericPartidaId, equipoNumero: selectedTeam },
      (response) => {
        setLoading(false);

        if (response.success) {
          drawCanvas(response.drawing);
          setLastUpdate(new Date());
        } else {
          setError(response.error || 'Error desconocido al obtener dibujo');
          clearCanvas();
        }
      }
    );
  };

  // Dibujo real
  const drawCanvas = (drawingData) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!drawingData) return;

  // 📐 Tamaño original de los canvas de Konva en el frontend
  const sourceWidth = 800;
  const sourceHeight = 600;
  const canvasWidth = canvas.width;   // 800
  const canvasHeight = canvas.height; // 600

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
        const rawX = path.points[i];
        const rawY = path.points[i + 1];
        if (typeof rawX !== 'number' || typeof rawY !== 'number') continue;

        const x = rawX * scaleX;
        const y = rawY * scaleY;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    });
  });

  console.log('[Professor] Dibujo escalado fijo 1280→800 completado');
};


  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Cuando cambia de equipo
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

  return (
    <div className="live-view-container">
      {/* Título centrado */}
      <div className="live-view-header">
        <h3>Vista en vivo</h3>
      </div>

      {/* Contenido principal */}
      <div className="live-view-main">
        {/* Columna de equipos */}
        <div className="teams-section">
          <div className="teams-header">
            <h4>Equipos</h4>
            <span className="teams-count">{teams.length} equipos</span>
          </div>
          <div className="teams-list">
            {teams.map((team) => (
              <button
                key={team}
                className={`team-btn ${team === selectedTeam ? 'active' : ''}`}
                onClick={() => setSelectedTeam(team)}
              >
                <span>Equipo {team}</span>
                {team === selectedTeam && <i className="fas fa-circle"></i>}
              </button>
            ))}
          </div>
        </div>

        {/* Área del canvas */}
        <div className="canvas-section">
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
            />
          </div>
        </div>
      </div>

      {/* Barra de estado minimalista */}
      <div className="status-bar">
        {loading && <span className="loading">Cargando...</span>}
        {error && <span className="error">{error}</span>}
      </div>
    </div>
  );
};

export default ProfessorDrawingViewer;
