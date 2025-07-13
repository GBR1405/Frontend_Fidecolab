import React, { useEffect, useRef, useState } from 'react';

const ProfessorDrawingViewer = ({ partidaId, socket }) => {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  // Convertir partidaId a número y validar
  const numericPartidaId = Number(partidaId);
  if (isNaN(numericPartidaId)) {
    // El error se manejará en los efectos
  }

  // Obtener lista de equipos al montar
  useEffect(() => {
    if (isNaN(numericPartidaId)) {
      setError('ID de partida inválido');
      return;
    }

    console.log('[Professor] Montando componente, obteniendo equipos...');
    if (!socket) {
      console.log('[Professor] Socket no disponible');
      setError('Socket no disponible');
      return;
    }

    socket.emit('getTeamsForPartida', numericPartidaId, (response) => {
      console.log('[Professor] Respuesta de equipos:', response);
      
      if (response.success) {
        setTeams(response.equipos);
        if (response.equipos.length > 0) {
          setSelectedTeam(response.equipos[0]);
          console.log('[Professor] Equipo inicial seleccionado:', response.equipos[0]);
        }
      } else {
        console.error('[Professor] Error obteniendo equipos:', response.error);
        setError(`Error obteniendo equipos: ${response.error || 'Desconocido'}`);
      }
    });
  }, [socket, numericPartidaId]);

  // Función para obtener y dibujar los trazos del equipo
  const fetchAndDrawTeamDrawing = async () => {
    if (isNaN(numericPartidaId)) {
      setError('ID de partida inválido');
      return;
    }

    if (!socket || !selectedTeam) {
      console.log('[Professor] Socket o equipo no disponible para obtener dibujo');
      return;
    }

    console.log(`[Professor] Solicitando dibujo para equipo ${selectedTeam}...`);
    setLoading(true);
    setError(null);
    
    try {
      socket.emit('professorGetTeamDrawing', { 
        partidaId: numericPartidaId, 
        equipoNumero: selectedTeam 
      }, (response) => {
        console.log(`[Professor] Respuesta dibujo equipo ${selectedTeam}:`, response);
        setLoading(false);
        
        if (response.success) {
          drawCanvas(response.drawing);
          setLastUpdate(new Date());
        } else {
          const errorMsg = response.error || 'Error desconocido al obtener dibujo';
          console.error(`[Professor] Error obteniendo dibujo: ${errorMsg}`);
          setError(errorMsg);
          clearCanvas();
        }
      });
    } catch (error) {
      console.error('[Professor] Error en solicitud:', error);
      setLoading(false);
      setError('Excepción al solicitar dibujo');
      clearCanvas();
    }
  };

  // Dibujar en el canvas
  const drawCanvas = (drawingData) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('[Professor] Canvas no disponible para dibujar');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!drawingData) {
      console.log('[Professor] Sin datos de dibujo');
      return;
    }
    
    console.log(`[Professor] Dibujando ${Object.keys(drawingData).length} usuarios...`);
    
    // Configurar canvas
    canvas.width = 800;
    canvas.height = 600;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Dibujar todos los trazos
    Object.values(drawingData).forEach((userPaths) => {
      userPaths.forEach((path) => {
        if (!path.points || path.points.length === 0) return;
        
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

  // Limpiar canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log('[Professor] Canvas limpiado');
  };

  // Cargar dibujo cuando cambia el equipo seleccionado
  useEffect(() => {
    if (selectedTeam !== null) {
      fetchAndDrawTeamDrawing();
    }
  }, [selectedTeam]);

  // Actualización periódica cada 2 segundos
  useEffect(() => {
    if (!selectedTeam) return;
    
    const intervalId = setInterval(() => {
      fetchAndDrawTeamDrawing();
    }, 2000);
    
    return () => {
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
          {error && <span className="error-message" style={{color: 'red'}}>{error}</span>}
        </div>
        
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
          style={{ 
            backgroundColor: '#fff', 
            borderRadius: '8px',
            border: '1px solid #ddd'
          }}
        />
      </div>
      
      <div className="debug-info">
        <p>Partida: {numericPartidaId} (Tipo: {typeof numericPartidaId})</p>
        <p>Equipo seleccionado: {selectedTeam || 'Ninguno'}</p>
        <p>Total equipos: {teams.length}</p>
      </div>
    </div>
  );
};

export default ProfessorDrawingViewer;