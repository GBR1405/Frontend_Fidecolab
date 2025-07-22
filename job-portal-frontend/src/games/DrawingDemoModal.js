import React, { useState, useRef,useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import Swal from 'sweetalert2';
import '../styles/DrawingDemoModal.css';

const DrawingDemoModal = ({ partidaId, equipoNumero, userId, isProfessor }) => {
  const socket = useSocket();
  const [currentTeam, setCurrentTeam] = useState(1);
  const [totalTeams, setTotalTeams] = useState(0);
  const [drawingData, setDrawingData] = useState(null);
  const [votedTeams, setVotedTeams] = useState([]);
  const [votes, setVotes] = useState({});
  const [isActive, setIsActive] = useState(false);
  const [teamsList, setTeamsList] = useState([]);
  const canvasRef = useRef(null);

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

  // Verificar estado al cargar
  useEffect(() => {
    if (!socket) return;

    // Obtener estado inicial
    socket.emit('checkDrawingDemo', partidaId, (response) => {
      if (response.active) {
        setIsActive(true);
        setCurrentTeam(response.currentTeam);
        setTotalTeams(response.totalTeams);
        setTeamsList(response.teams);
        loadDrawing(response.currentTeam);
      }
    });

    // Escuchar activación/desactivación
    socket.on('drawingDemoStarted', handleDemoStarted);
    socket.on('drawingDemoTeamChanged', handleTeamChanged);
    socket.on('drawingDemoEnded', handleDemoEnded);
    socket.on('drawingDemoVotesUpdated', handleVotesUpdated);

    return () => {
      socket.off('drawingDemoStarted', handleDemoStarted);
      socket.off('drawingDemoTeamChanged', handleTeamChanged);
      socket.off('drawingDemoEnded', handleDemoEnded);
      socket.off('drawingDemoVotesUpdated', handleVotesUpdated);
    };
  }, [socket, partidaId]);

  const handleDemoStarted = ({ currentTeam, totalTeams, teams }) => {
    setIsActive(true);
    setCurrentTeam(currentTeam);
    setTotalTeams(totalTeams);
    setTeamsList(teams);
    loadDrawing(currentTeam);
  };

  const handleTeamChanged = ({ currentTeam }) => {
    setCurrentTeam(currentTeam);
    loadDrawing(currentTeam);
  };

  const handleDemoEnded = () => {
    setIsActive(false);
    setVotedTeams([]);
    setVotes({});
  };

  const handleVotesUpdated = (updatedVotes) => {
    setVotes(updatedVotes);
  };

  const loadDrawing = (teamNumber) => {
    socket.emit('getTeamDrawingForDemo', { partidaId, equipoNumero: teamNumber }, (response) => {
      if (response.success) {
    setDrawingData(response.drawing);
    drawCanvas(response.drawing); // ✅ renderizar
    }
    });
  };

  const changeTeam = (direction) => {
    const currentIndex = teamsList.indexOf(currentTeam);
    let newIndex;

    if (direction === 'next') {
      newIndex = (currentIndex + 1) % teamsList.length;
    } else {
      newIndex = (currentIndex - 1 + teamsList.length) % teamsList.length;
    }

    const newTeam = teamsList[newIndex];
    socket.emit('changeDrawingDemoTeam', { partidaId, equipoNumero: newTeam });
  };

  const handleVote = () => {
    if (votedTeams.includes(currentTeam)) return;

    socket.emit('voteForDrawing', { partidaId, equipoNumero: currentTeam, userId }, (response) => {
      if (response.success) {
        setVotedTeams([...votedTeams, currentTeam]);
        Swal.fire({
          title: 'Voto registrado',
          text: `Has votado por el dibujo del Equipo ${currentTeam}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
    });
  };

  const endDemo = () => {
    socket.emit('endDrawingDemo', partidaId);
  };

  const downloadDrawing = () => {
    if (!drawingData) return;

    const link = document.createElement('a');
    link.download = `dibujo-equipo-${currentTeam}.png`;
    link.href = drawingData;
    link.click();
  };

  if (!isActive) return null;

  // Encontrar equipo más votado
  const getMostVotedTeam = () => {
    if (Object.keys(votes).length === 0) return null;

    const maxVotes = Math.max(...Object.values(votes));
    const topTeams = Object.entries(votes)
      .filter(([_, count]) => count === maxVotes)
      .map(([team]) => parseInt(team));

    return topTeams.length > 1 ? topTeams : topTeams[0];
  };

  const mostVoted = getMostVotedTeam();

  return (
    <div className="demo-modal-overlay">
      <div className="demo-modal-container">
        <div className="demo-header">
          <h2>Modo Demostración</h2>
          <button className="close-demo-btn" onClick={endDemo}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="demo-content">
          {/* Columna izquierda - Dibujo */}
          <div className="demo-drawing-container">
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="demo-drawing"
            />
            </div>

          {/* Columna derecha - Controles e información */}
          <div className="demo-controls-container">
            <div className="demo-info-section">
              <h3>Equipo Actual: {currentTeam}</h3>
              
              {mostVoted && (
                <div className="most-voted-section">
                  <h4>Equipo(s) más votado(s):</h4>
                  {Array.isArray(mostVoted) ? (
                    <div className="multiple-top-teams">
                      {mostVoted.map(team => (
                        <span key={team} className="top-team-badge">Equipo {team}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="top-team-badge">Equipo {mostVoted}</span>
                  )}
                </div>
              )}
            </div>

            <div className="demo-buttons-section">
              {isProfessor ? (
                <>
                  <button 
                    onClick={() => changeTeam('prev')}
                    disabled={currentTeam <= 1}
                    className="demo-nav-btn prev-btn"
                  >
                    <i className="fas fa-chevron-left"></i> Anterior
                  </button>
                  <button 
                    onClick={() => changeTeam('next')}
                    disabled={currentTeam >= totalTeams}
                    className="demo-nav-btn next-btn"
                  >
                    Siguiente <i className="fas fa-chevron-right"></i>
                  </button>
                  <button 
                    onClick={endDemo}
                    className="demo-end-btn"
                  >
                    Finalizar Demostración
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={downloadDrawing}
                    disabled={!drawingData}
                    className="demo-download-btn"
                  >
                    <i className="fas fa-download"></i> Descargar
                  </button>
                  <button 
                    onClick={handleVote}
                    disabled={votedTeams.includes(currentTeam) || !drawingData}
                    className="demo-vote-btn"
                  >
                    {votedTeams.includes(currentTeam) ? (
                      <><i className="fas fa-check"></i> Votado</>
                    ) : (
                      <><i className="fas fa-vote-yea"></i> Votar</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingDemoModal;