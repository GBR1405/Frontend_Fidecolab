import React, { useEffect, useRef, useState } from 'react';

const ProfessorDrawingViewer = ({ partidaId, socket }) => {
  const [selectedTeam, setSelectedTeam] = useState(1);
  const [teams, setTeams] = useState([]);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // Obtener lista de equipos
  useEffect(() => {
    if (!socket) return;

    socket.emit('getTeamsForPartida', partidaId, (response) => {
      if (response.success && response.equipos.length > 0) {
        setTeams(response.equipos);
        setSelectedTeam(response.equipos[0]);
      }
    });
  }, [socket, partidaId]);

  // Función para dibujar en el canvas
  const drawCanvas = (drawingData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Configurar canvas si es necesario
    if (canvas.width !== 800 || canvas.height !== 600) {
      canvas.width = 800;
      canvas.height = 600;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    
    // Dibujar todos los trazos
    Object.values(drawingData).forEach(userPaths => {
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

  // Solicitar dibujos del equipo seleccionado
  const fetchTeamDrawing = () => {
    if (!socket || !selectedTeam) return;
    
    socket.emit('professorGetTeamDrawing', { 
      partidaId, 
      equipoNumero: selectedTeam 
    }, (response) => {
      if (response.success) {
        drawCanvas(response.drawing);
      } else {
        // Canvas vacío si no hay dibujo
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    });
  };

  // Loop de actualización (cada segundo)
  useEffect(() => {
    const updateInterval = 1000; // 1 segundo
    
    const updateDrawing = (time) => {
      if (time - lastUpdateRef.current > updateInterval) {
        lastUpdateRef.current = time;
        fetchTeamDrawing();
      }
      requestRef.current = requestAnimationFrame(updateDrawing);
    };
    
    requestRef.current = requestAnimationFrame(updateDrawing);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
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
              onClick={() => {
                setSelectedTeam(team);
                // Actualizar inmediatamente al cambiar de equipo
                fetchTeamDrawing();
              }}
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
          style={{ 
            backgroundColor: '#fff', 
            borderRadius: '8px',
            border: '1px solid #ddd'
          }}
        />
      </div>
    </div>
  );
};

export default ProfessorDrawingViewer;