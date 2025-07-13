import React, { useEffect, useRef, useState } from 'react';

const ProfessorDrawingViewer = ({ partidaId, socket }) => {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Obtener lista de equipos al montar
  useEffect(() => {
    console.log('[Professor] Montando componente, obteniendo equipos...');
    if (!socket) {
      console.log('[Professor] Socket no disponible');
      return;
    }

    socket.emit('getTeamsForPartida', partidaId, (response) => {
      console.log('[Professor] Respuesta de equipos:', response);
      if (response.success) {
        setTeams(response.equipos);
        if (response.equipos.length > 0) {
          setSelectedTeam(response.equipos[0]);
          console.log('[Professor] Equipo inicial seleccionado:', response.equipos[0]);
        }
      } else {
        console.error('[Professor] Error obteniendo equipos:', response.error);
      }
    });
  }, [socket, partidaId]);

  // Función para obtener y dibujar los trazos del equipo
  const fetchAndDrawTeamDrawing = async () => {
    if (!socket || !selectedTeam) {
      console.log('[Professor] Socket o equipo no disponible para obtener dibujo');
      return;
    }

    console.log(`[Professor] Solicitando dibujo para equipo ${selectedTeam}...`);
    setLoading(true);
    
    try {
      socket.emit('professorGetTeamDrawing', { 
        partidaId, 
        equipoNumero: selectedTeam 
      }, (response) => {
        console.log(`[Professor] Respuesta dibujo equipo ${selectedTeam}:`, response);
        setLoading(false);
        
        if (response.success) {
          drawCanvas(response.drawing);
          setLastUpdate(new Date());
        } else {
          console.error(`[Professor] Error obteniendo dibujo: ${response.error}`);
          clearCanvas();
        }
      });
    } catch (error) {
      console.error('[Professor] Error en solicitud:', error);
      setLoading(false);
      clearCanvas();
    }
  };

  // Función para dibujar en el canvas
  const drawCanvas = (drawingData) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('[Professor] Canvas no disponible para dibujar');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    console.log(`[Professor] Dibujando ${Object.keys(drawingData).length} usuarios...`);
    
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
    Object.values(drawingData).forEach((userPaths, userIndex) => {
      userPaths.forEach((path, pathIndex) => {
        if (!path.points || path.points.length === 0) {
          console.log(`[Professor] Path vacío para usuario ${userIndex}, path ${pathIndex}`);
          return;
        }
        
        ctx.beginPath();
        ctx.strokeStyle = path.color || '#000000';
        ctx.lineWidth = path.strokeWidth || 2;
        
        path.points.forEach((point, pointIndex) => {
          if (pointIndex === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        
        ctx.stroke();
      });
    });
    
    console.log('[Professor] Dibujo completado');
  };

  // Función para limpiar el canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log('[Professor] Canvas limpiado');
  };

  // Al cambiar de equipo o montar
  useEffect(() => {
    console.log('[Professor] Equipo seleccionado cambiado:', selectedTeam);
    if (selectedTeam !== null) {
      fetchAndDrawTeamDrawing();
    }
  }, [selectedTeam]);

  // Actualización periódica cada 2 segundos
  useEffect(() => {
    if (!selectedTeam) return;
    
    console.log('[Professor] Iniciando actualización periódica...');
    const intervalId = setInterval(() => {
      console.log('[Professor] Actualización periódica solicitada');
      fetchAndDrawTeamDrawing();
    }, 2000);
    
    return () => {
      console.log('[Professor] Limpiando intervalo');
      clearInterval(intervalId);
    };
  }, [selectedTeam]);

  return (
    <div className="professor-drawing-viewer">
      <div className="team-selector">
        <h3>Vista de Dibujo en Vivo</h3>
        <div className="status-info">
          {loading && <span className="loading-indicator">Cargando...</span>}
          {lastUpdate && (
            <span className="last-update">
              Actualizado: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="team-buttons">
          {teams.map(team => (
            <button
              key={team}
              className={team === selectedTeam ? 'active' : ''}
              onClick={() => {
                console.log(`[Professor] Cambiando a equipo ${team}`);
                setSelectedTeam(team);
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
      
      <div className="debug-info">
        <p>Partida: {partidaId}</p>
        <p>Equipo seleccionado: {selectedTeam || 'Ninguno'}</p>
        <p>Total equipos: {teams.length}</p>
      </div>
    </div>
  );
};

export default ProfessorDrawingViewer;