import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

const DrawingLiveViewer = ({ partidaId }) => {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const canvasRef = useRef(null);
  const socket = useSocket();

  // Obtener lista de equipos
  useEffect(() => {
    if (!socket) return;

    socket.emit('getTeamsForPartida', partidaId, (response) => {
      if (response.success) {
        setTeams(response.equipos);
        if (response.equipos.length > 0) {
          setSelectedTeam(response.equipos[0]);
        }
      }
    });
  }, [socket, partidaId]);

  // Cargar y actualizar dibujo cuando cambia el equipo seleccionado
  useEffect(() => {
    if (!socket || !selectedTeam || !canvasRef.current) return;

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
    const drawPaths = (paths) => {
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

    // Solicitar dibujo inicial
    socket.emit('getTeamDrawingLive', { 
      partidaId, 
      equipoNumero: selectedTeam 
    }, (response) => {
      if (response.success) {
        drawPaths(response.drawing);
      }
    });

    // Escuchar actualizaciones en tiempo real
    const handleLiveUpdate = (data) => {
      if (data.equipoNumero === selectedTeam) {
        drawPaths(data.drawing);
      }
    };

    socket.on('teamDrawingLiveUpdate', handleLiveUpdate);

    return () => {
      socket.off('teamDrawingLiveUpdate', handleLiveUpdate);
    };
  }, [socket, partidaId, selectedTeam]);

  return (
    <div className="drawing-viewer-container">
      <div className="team-selector">
        <h3>Ver dibujo en vivo</h3>
        {teams.length > 0 ? (
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
        ) : (
          <p>No hay equipos disponibles</p>
        )}
      </div>

      <div className="canvas-container">
        <canvas 
          ref={canvasRef}
          className="drawing-canvas"
          width="800"
          height="600"
        />
      </div>
    </div>
  );
};

export default DrawingLiveViewer;