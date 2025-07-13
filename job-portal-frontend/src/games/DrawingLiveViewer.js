import React, { useEffect, useRef, useState } from 'react';

const ProfessorDrawingViewer = ({ partidaId, socket }) => {
  const [selectedTeam, setSelectedTeam] = useState(1);
  const canvasRef = useRef(null);
  const [teams, setTeams] = useState([]);

  // Obtener lista de equipos
  useEffect(() => {
    if (!socket) return;

    socket.emit('getTeamsForPartida', partidaId, (response) => {
      if (response.success) {
        setTeams(response.equipos);
      }
    });
  }, [socket, partidaId]);

  // Configurar canvas y listeners
  useEffect(() => {
    if (!socket || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Configuración inicial del canvas
    const setupCanvas = () => {
      const scale = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * scale;
      canvas.height = canvas.offsetHeight * scale;
      ctx.scale(scale, scale);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    setupCanvas();

    // Función para dibujar en el canvas
    const drawOnCanvas = (paths) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      Object.values(paths).forEach(userPaths => {
        userPaths.forEach(path => {
          if (!path.points || path.points.length === 0) return;
          
          ctx.beginPath();
          ctx.strokeStyle = path.color || '#000000';
          ctx.lineWidth = path.strokeWidth || 2;
          
          path.points.forEach((point, i) => {
            if (i === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          
          ctx.stroke();
        });
      });
    };

    // Solicitar dibujo inicial al cambiar de equipo
    const loadTeamDrawing = () => {
      socket.emit('professorGetTeamDrawing', { 
        partidaId, 
        equipoNumero: selectedTeam 
      }, (response) => {
        if (response.success) {
          drawOnCanvas(response.drawing);
        }
      });
    };

    // Escuchar actualizaciones en tiempo real
    const handleProfessorDrawingUpdate = (data) => {
      if (data.equipoNumero === selectedTeam) {
        drawOnCanvas(data.drawing);
      }
    };

    socket.on('professorDrawingUpdate', handleProfessorDrawingUpdate);
    loadTeamDrawing();

    return () => {
      socket.off('professorDrawingUpdate', handleProfessorDrawingUpdate);
    };
  }, [socket, partidaId, selectedTeam]);

  return (
    <div className="professor-drawing-viewer">
      <div className="team-selector">
        <h3>Vista de Dibujo en Vivo</h3>
        <div className="team-buttons">
          {teams.map(team => (
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
      
      <div className="canvas-container">
        <canvas 
          ref={canvasRef}
          width="800"
          height="600"
          style={{ backgroundColor: '#fff', borderRadius: '8px' }}
        />
      </div>
    </div>
  );
};

export default ProfessorDrawingViewer;