import React, { useEffect, useRef, useState } from 'react';

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
  const sourceWidth = 1280;
  const sourceHeight = 720;
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
    <div className="professor-drawing-viewer">
      <div className="team-selector">
        <h3>Vista de Dibujo en Vivo</h3>

        <div className="status-info">
          {loading && <span className="loading-indicator">Cargando...</span>}
          {lastUpdate && (
            <span className="last-update">
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          {error && <span className="error-message" style={{ color: 'red' }}>{error}</span>}
        </div>

        <div className="team-buttons">
          {teams.map((team) => (
            <button
              key={team}
              className={team === selectedTeam ? 'active' : ''}
              onClick={() => setSelectedTeam(team)}
            >
              Equipo {team}
            </button>
          ))}
        </div>
      </div>

      <div className="canvas-container" style={{ marginTop: '1rem' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '8px'
          }}
        />
      </div>

      <div className="debug-info">
        <p>Partida: {numericPartidaId}</p>
        <p>Equipo seleccionado: {selectedTeam || 'Ninguno'}</p>
        <p>Total equipos: {teams.length}</p>
      </div>
    </div>
  );
};

export default ProfessorDrawingViewer;
