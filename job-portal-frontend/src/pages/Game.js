import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import LayoutSimulation from '../components/LayoutSimulation';
import "../styles/simulationComponents.css";
import { games } from '../games/GameConfiguration';
import "../styles/TeamRoom.css";
import Swal from 'sweetalert2';
import "../styles/TransicionesSimulacion.css";

import MemoryGame from '../games/MemoryGame';
import HangmanGame from '../games/HangmanGame';
import PuzzleGame from '../games/PuzzleGame';
import DrawingGame from '../games/DrawingGame';

const TeamRoom = () => {
  const { partidaId, equipoNumero } = useParams();
  const socket = useSocket();
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentGameInfo, setCurrentGameInfo] = useState(null);
  const [gameProgress, setGameProgress] = useState({ current: 0, total: 0 });
  const [showTransition, setShowTransition] = useState(false);
  const [transitionGame, setTransitionGame] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const cursorContainerRef = useRef(null);
  const userId = localStorage.getItem('userId');
  const roomId = `team-${partidaId}-${equipoNumero}`;
  const transitionTimeoutRef = useRef(null);
  const timerRef = useRef(null);
  const [timer, setTimer] = useState({
    remaining: 0,
    total: 0,
    active: false,
    gameType: '',
    difficulty: ''
  });
  const [initialLoad, setInitialLoad] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [initialTimerSet, setInitialTimerSet] = useState(false);
  const [firstGameConfig, setFirstGameConfig] = useState(null);
  const [transitionPhase, setTransitionPhase] = useState('idle');
  const [showBlackout, setShowBlackout] = useState(false);

  const navigate = useNavigate();

   useEffect(() => {
  if (!socket) return;

  const onGameFinished = ({ partidaId }) => {
  // Crear overlay
  const overlay = document.createElement('div');
  overlay.className = 'finish-overlay';
  overlay.innerHTML = `
    <div class="finish-content">
      <h1 class="finish-title">Partida Finalizada</h1>
      <div class="finish-line"></div>
      <p class="finish-countdown">Redirigiendo en <span class="finish-count">8</span> segundos...</p>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Activar animación
  setTimeout(() => overlay.classList.add('active'), 10);
  
  // Temporizador con mejor feedback visual
  let count = 8;
  const countElement = overlay.querySelector('.finish-count');
  const interval = setInterval(() => {
    count--;
    
    if (countElement) {
      countElement.textContent = count;
      
      // Destacar los últimos 3 segundos
      if (count <= 3) {
        countElement.style.color = '#ff6b6b';
        countElement.style.animation = 'pulse 0.5s infinite alternate';
      }
    }
    
    if (count <= 0) {
      clearInterval(interval);
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        window.location.href = `/resultados/${partidaId}`;
      }, 500);
    }
  }, 1000);

  // Añadir estilo para el pulso
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      to { transform: scale(1.3); opacity: 0.8; }
    }
  `;
  document.head.appendChild(style);
  
  // Limpiar al desmontar
  return () => {
    clearInterval(interval);
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
    document.head.removeChild(style);
  };
};

  socket.on('gameFinished', onGameFinished);
  return () => socket.off('gameFinished', onGameFinished);
}, [socket]);

  useEffect(() => {
  const handlePopState = (event) => {
    event.preventDefault();
    navigate('/', { replace: true });
  };

  // Bloquear retroceso
  window.addEventListener('popstate', handlePopState);

  // Reemplazar la entrada actual en el historial (para evitar que "volver" lo lleve a atrás)
  window.history.replaceState(null, '', window.location.href);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}, [navigate]);



useEffect(() => {
  if (!partidaId || !equipoNumero) {
    navigate('/', { replace: true });
  }
}, [partidaId, equipoNumero]);

  // Función para generar hash de un string
  const hashCode = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  // Actualizar cursor remoto
  const updateCursor = (userId, normalizedX, normalizedY) => {
    if (userId === localStorage.getItem('userId')) return;
    
    const container = cursorContainerRef.current;
    if (!container) return;
    
    // Obtener posición absoluta del contenedor
    const rect = container.getBoundingClientRect();
    
    // Calcular posición absoluta en píxeles
    const x = normalizedX * window.innerWidth;
    const y = normalizedY * window.innerHeight;
    
    let cursor = document.getElementById(`cursor-${userId}`);
    
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = `cursor-${userId}`;
      cursor.className = 'remote-cursor';
      
      const color = `hsl(${hashCode(userId) % 360}, 70%, 50%)`;
      cursor.style.setProperty('--cursor-color', color);
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'cursor-name';
      nameSpan.textContent = getUserName(userId);
      cursor.appendChild(nameSpan);
      
      container.appendChild(cursor);
    }
  
    // Aplicar posición absoluta con transform
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
  };

  // Obtener nombre de usuario
  const getUserName = (userId) => {
    const miembro = teamMembers.find(m => m.userId === userId);
    if (miembro) return miembro.fullName;

    if (userId === localStorage.getItem('userId')) {
      return localStorage.getItem('userFullName') || `Tú (${userId})`;
    }

    return `Usuario ${userId}`; // Nombre genérico temporal
  };

  // Manejar movimiento del mouse
  const handleMouseMove = (e) => {
    if (!cursorContainerRef.current || !socket) return;

    const normalizedX = e.clientX / window.innerWidth;
    const normalizedY = e.clientY / window.innerHeight;

    socket.emit('SendMousePosition', { 
      roomId: `team-${partidaId}-${equipoNumero}`,
      userId,
      x: normalizedX,
      y: normalizedY
    });
  };

  // Configuración inicial y listeners
  useEffect(() => {
    if (!socket || !partidaId || !equipoNumero) return;

    // Unirse a la sala del equipo
    socket.emit('JoinTeamRoom', { 
      partidaId, 
      equipoNumero,
      userId 
    });

    // Unirse a la sala general de la partida
    socket.emit('joinPartidaRoom', partidaId);

    // Configurar listeners
    const handleUpdateTeamMembers = (members) => {
      setTeamMembers(members);
    };

    const handleBroadcastMouse = (userId, x, y) => {
      updateCursor(userId, x, y);
    };

    const handleGameChange = (data) => {
      handleGameChangeWithTransition(data);
    };

    const handleTimerUpdate = ({ remaining, total, gameType, difficulty }) => {
      setTimer({
        remaining,
        total,
        active: remaining > 0,
        gameType,
        difficulty
      });
    };

    const handleTimeUp = (gameType) => {
      setTimer(prev => ({
        ...prev,
        remaining: 0,
        active: false
      }));
      
      Swal.fire({
        title: '¡Tiempo terminado!',
        text: `Se ha acabado el tiempo para el juego ${gameType}.`,
        icon: 'info',
        showConfirmButton: false,
        allowOutsideClick: false
      });
    };

    

    // Configurar listeners
    socket.on('UpdateTeamMembers', handleUpdateTeamMembers);
    socket.on('BroadcastMousePosition', handleBroadcastMouse);
    socket.on('gameChanged', handleGameChange);
    socket.on('timerUpdate', handleTimerUpdate);
    socket.on('timeUp', handleTimeUp);

    // Obtener configuración del juego
    socket.emit('getGameConfig', partidaId, (response) => {
      if (response.error) {
        console.error('Error al obtener configuración:', response.error);
        return;
      }

      if (response.juegos?.length > 0) {
        const initialIndex = response.currentIndex || 0;
        const currentGame = response.juegos[initialIndex];
        
        if (games[currentGame.tipo.toLowerCase()]) {
          setCurrentGameInfo({
            ...games[currentGame.tipo.toLowerCase()],
            config: currentGame.configEspecifica,
            dificultad: currentGame.dificultad,
            tema: currentGame.tema
          });
          
          setGameProgress({
            current: initialIndex + 1,
            total: response.juegos.length
          });
          resetTimer();
        }
      }
    });

    // Agregar listener de movimiento del mouse
    window.addEventListener('mousemove', handleMouseMove);

    // Limpieza
    return () => {
      socket.off('UpdateTeamMembers', handleUpdateTeamMembers);
      socket.off('BroadcastMousePosition', handleBroadcastMouse);
      socket.off('gameChanged', handleGameChange);
      socket.off('timerUpdate', handleTimerUpdate);
      socket.off('timeUp', handleTimeUp);
      
      window.removeEventListener('mousemove', handleMouseMove);
      
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Limpiar cursores al desmontar
      const container = cursorContainerRef.current;
      if (container) {
        const remoteCursors = container.querySelectorAll('.remote-cursor');
        remoteCursors.forEach(cursor => cursor.remove());
      }
    };
  }, [socket, partidaId, equipoNumero, userId]);

  useEffect(() => {
    if (!socket) return;
  
    const handleTimerUpdate = ({ remaining, total, gameType, difficulty }) => {
      setTimer({
        remaining,
        total,
        active: remaining > 0,
        gameType,
        difficulty
      });
  
      // Verificar si el tiempo llegó a 0 al recibir una actualización
      if (remaining <= 0) {
        handleTimeUp(gameType);
      }
    };
  
    const handleTimeUp = (gameType) => {
      // Evitar mostrar múltiples alerts
      if (window.timeUpAlert) return;
  
      setTimer(prev => ({
        ...prev,
        remaining: 0,
        active: false
      }));
      
      // Mostrar notificación de tiempo terminado (sin timer para que no se cierre solo)
      Swal.fire({
        title: '¡Tiempo terminado!',
        text: `Se ha acabado el tiempo para el juego ${gameType}. El profesor pasará al siguiente juego cuando todos estén listos.`,
        icon: 'info',
        showConfirmButton: false,
        allowOutsideClick: false,
        willOpen: () => {
          // Guardar referencia del alert para cerrarlo luego
          window.timeUpAlert = Swal.getPopup();
        }
      });
    };
  
    // Verificación inicial al cargar el componente
    const checkInitialTimerState = () => {
      // Si el timer ya está en 0 (por ejemplo, al recargar la página)
      if (timer.remaining <= 0 && timer.gameType) {
        handleTimeUp(timer.gameType);
      }
      // Si no hay datos del timer (estado inicial)
      else if (!timer.gameType) {
        // Esperar un momento para recibir la actualización del servidor
        setTimeout(() => {
          if (timer.remaining <= 0 && timer.gameType) {
            handleTimeUp(timer.gameType);
          }
        }, 1000);
      }
    };
  
    socket.on('timerUpdate', handleTimerUpdate);
    socket.on('timeUp', handleTimeUp);
  
    // Solicitar sincronización del tiempo al conectarse
    socket.emit('RequestTimeSync', partidaId);
  
    // Ejecutar la verificación inicial
    checkInitialTimerState();
  
    return () => {
      socket.off('timerUpdate', handleTimerUpdate);
      socket.off('timeUp', handleTimeUp);
      
      // Limpiar el alert al desmontar
      if (window.timeUpAlert) {
        Swal.close();
        window.timeUpAlert = null;
      }
    };
  }, [socket, partidaId, timer.remaining, timer.gameType]);

  // Temporizador
  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimeElapsed(0);
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
  };

  // Formatear tiempo
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Porcentaje de tiempo restante
  const getTimePercentage = () => {
    if (timer.total === 0) return 100;
    return Math.max(0, (timer.remaining / timer.total) * 100);
  };

  // Transición entre juegos
  const handleGameChangeWithTransition = (data) => {
  const nextGame = {
    ...games[data.currentGame.tipo.toLowerCase()],
    name: data.currentGame.tipo,
    config: data.currentGame.configEspecifica,
    dificultad: data.currentGame.dificultad,
    tema: data.currentGame.tema
  };

  // Etapa 1: mostrar blur
  setTransitionPhase('blurring');
  setTransitionGame(nextGame);

  // Esperar breve para aplicar el blur (300ms)
  setTimeout(() => {
    // Etapa 2: mostrar "Siguiente Juego"
    setTransitionPhase('next-game');

    // Etapa 3: después de 2.5s, cambiar fondo (juego) y preparar instrucciones
    setTimeout(() => {
      // Cambiar juego en background (sin quitar overlay)
      setCurrentGameInfo(nextGame);
      setGameProgress({
        current: data.currentIndex + 1,
        total: data.total
      });

      // Etapa 4: mostrar instrucciones casi de inmediato
      setTimeout(() => {
        setTransitionPhase('instructions');

        // Etapa 5: después de 0.6s, mostrar botón
        setTimeout(() => {
          setTransitionPhase('ready');
        }, 600);
      }, 100); // solo 100ms entre cambio de juego y aparición de instrucciones
    }, 2500); // más corto, antes era 4000ms
  }, 300);
};



  // Pantalla de bienvenida
  useEffect(() => {
    if (!showWelcome) return;
  
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowWelcome(false);
          if (socket) {
            socket.emit('RequestTimeSync', partidaId);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  
    return () => clearInterval(timer);
  }, [showWelcome, socket, partidaId]);

  // Mostrar ayuda
  const showHelpModal = () => {
    Swal.fire({
      title: 'Ayuda de la Simulación',
      width: '800px',
      html: `
        <div class="help-modal-container">
          <div class="help-tabs">
            <button class="tab-button active" data-tab="general">General</button>
            <button class="tab-button" data-tab="puzzle">Rompecabezas</button>
            <button class="tab-button" data-tab="memory">Memoria</button>
            <button class="tab-button" data-tab="quiz">Ahorcado</button>
            <button class="tab-button" data-tab="scramble">Dibujo</button>
          </div>
          
          <div class="tab-content active" id="general-tab">
            <h3>Cómo funciona la simulación</h3>
            <p>La simulación consiste en una serie de juegos que deben completar en equipo:</p>
            <ul>
              <li>El profesor controla el flujo de los juegos</li>
              <li>Cada juego tiene un tiempo límite</li>
              <li>Deben trabajar en equipo para resolver los desafíos</li>
              <li>Al final se mostrarán los resultados del equipo</li>
            </ul>
            <p><strong>Consejo:</strong> Colaboren y comuníquense bien para obtener mejores resultados.</p>
          </div>
          
          <div class="tab-content" id="puzzle-tab">
            <h3>Juego de Rompecabezas</h3>
            <p>Deben armar un rompecabezas entre todos los miembros del equipo:</p>
            <ul>
              <li>Cada miembro puede mover las piezas asignadas</li>
              <li>Las piezas se encajan cuando están en la posición correcta</li>
              <li>El tiempo comienza cuando el profesor inicia el juego</li>
            </ul>
            <p><strong>Consejo:</strong> Completen primero las esquinas para finalizar con el centro</p>
          </div>
          
          <div class="tab-content" id="memory-tab">
            <h3>Juego de Memoria</h3>
            <p>Encuentren las parejas de cartas:</p>
            <ul>
              <li>Todos pueden voltear las cartas cuando gusten</li>
              <li>Si hacen pareja, las cartas permanecen visibles</li>
              <li>El objetivo es encontrar todas las parejas en el menor tiempo posible</li>
            </ul>
          </div>
          
          <div class="tab-content" id="quiz-tab">
            <h3>Juego del Ahorcado</h3>
            <p>Adivinen la palabra!:</p>
            <ul>
              <li>Tendran una palabra y 10 intentos</li>
              <li>Entre todos piensen en cual palabra o frase puede ser</li>
              <li>Si pierden tendran que continuar, tengan en mente el tiempo</li>
            </ul>
          </div>
          
          <div class="tab-content" id="scramble-tab">
            <h3>Juego de dibujo</h3>
            <p>Dejen volar su imaginacion y trabajo en equipo:</p>
            <ul>
              <li>Tendran un tema especifico</li>
              <li>Deben dibujar entre todos aquel tema</li>
              <li>Al finalizar el tiempo o cuando el profesor decida tendran que exponer su dibujo</li>
            </ul>
          </div>
        </div>
      `,
      showConfirmButton: false,
      didOpen: () => {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
          button.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
          });
        });
      }
    });
  };

  // Pantalla de bienvenida
  if (showWelcome) {
    return (
      <LayoutSimulation>
        <div className="welcome-screen">
          <div className="welcome-content">
            <h1>¡Bienvenidos!</h1>
            <p>El juego comenzará en {countdown} segundos</p>
            
            <div className="team-members">
              {teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="member"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {member.fullName} {member.userId === userId && "(Tú)"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </LayoutSimulation>
    );
  }

  return (
    <LayoutSimulation>
      <div className="team-room-container">
        {/* Overlay de transición */}
        <div className={`_est_overlay ${transitionPhase !== 'idle' ? '_est_active' : ''}`}>
          {transitionPhase === 'next-game' && (
            <>
              <div className="_est_next-game">
                <div className="_est_next-text">Siguiente Juego:</div>
                <div className="_est_game-name">
                  {transitionGame?.name}
                  <span className="_est_game-icon">
                    {transitionGame?.name.toLowerCase().includes('memoria') && '🧠'}
                    {transitionGame?.name.toLowerCase().includes('dibujo') && '🎨'}
                    {transitionGame?.name.toLowerCase().includes('ahorcado') && '🎯'}
                    {transitionGame?.name.toLowerCase().includes('rompecabezas') && '🧩'}
                  </span>
                </div>
              </div>
              <div className="_est_line-horizontal"></div>
            </>
          )}

          {(transitionPhase === 'instructions' || transitionPhase === 'ready') && (
            <div className="_est_instructions">
              <h2 className="_est_instruction-title">Instrucciones</h2>

              {transitionGame?.name.toLowerCase().includes('memoria') && (
                <div className="_est_instruction-row">
                  <div className="_est_instruction-item">
                    <i className="fas fa-users _est_icon"></i>
                    <span>Trabajen en equipo</span>
                  </div>
                  <div className="_est_instruction-item">
                    <i className="fas fa-brain _est_icon"></i>
                    <span>Recuerden donde están las parejas</span>
                  </div>
                  <div className="_est_instruction-item">
                    <i className="fas fa-check-double _est_icon"></i>
                    <span>Encuentren todos para ganar</span>
                  </div>
                </div>
              )}

              {transitionGame?.name.toLowerCase().includes('dibujo') && (
                <div className="_est_instruction-row">
                  <div className="_est_instruction-item">
                    <i className="fas fa-paint-brush _est_icon"></i>
                    <span>Dibujen el tema específico</span>
                  </div>
                  <div className="_est_instruction-item">
                    <i className="fas fa-tint _est_icon"></i>
                    <span>¡Tienen tanque de tinta!</span>
                  </div>
                  <div className="_est_instruction-item">
                    <i className="fas fa-eraser _est_icon"></i>
                    <span>Si borran, se borra todo</span>
                  </div>
                </div>
              )}

              {transitionGame?.name.toLowerCase().includes('ahorcado') && (
                <div className="_est_instruction-row">
                  <div className="_est_instruction-item">
                    <i className="fas fa-vote-yea _est_icon"></i>
                    <span>Voten por la letra ganadora</span>
                  </div>
                  <div className="_est_instruction-item">
                    <i className="fas fa-skull-crossbones _est_icon"></i>
                    <span>Eviten llegar a 0</span>
                  </div>
                  <div className="_est_instruction-item">
                    <i className="fas fa-comments _est_icon"></i>
                    <span>La comunicación es importante</span>
                  </div>
                </div>
              )}

              {transitionGame?.name.toLowerCase().includes('rompecabezas') && (
                <div className="_est_instruction-row">
                  <div className="_est_instruction-item">
                    <i className="fas fa-image _est_icon"></i>
                    <span>Revisen las referencias</span>
                  </div>
                  <div className="_est_instruction-item">
                    <i className="fas fa-shoe-prints _est_icon"></i>
                    <span>Límite de movimientos</span>
                  </div>
                  <div className="_est_instruction-item">
                    <i className="fas fa-exclamation-triangle _est_icon"></i>
                    <span>Tengan cuidado con lo que mueven</span>
                  </div>
                </div>
              )}

              {transitionPhase === 'ready' && (
                <button className="_est_start-btn" onClick={() => setTransitionPhase('idle')}>
                  <i className="fas fa-play"></i> Comenzar
                </button>
              )}
            </div>
          )}
        </div>



        {/* Área del juego */}
        <div ref={cursorContainerRef} className="game-container">
          {/* Header del equipo */}
          <div className="team-room-header">
            <h1>Equipo {equipoNumero}</h1>
            {currentGameInfo.name.toLowerCase().includes('dibujo') && <h3 className="game__topic">Tema: {currentGameInfo.tema}</h3>}            
            {currentGameInfo && (              
              <div className="game-progress">
                Juego {gameProgress.current} de {gameProgress.total}                
              </div>
            )}
          </div>

          {/* Efecto blur durante transición */}
          <div className={`game-display ${
              (transitionPhase === 'blurring' || transitionPhase === 'showing') ? '_blurring' : ''
            }`}>
              {currentGameInfo ? (
                <>
                  {currentGameInfo.name.toLowerCase().includes('dibujo') ? (
                    <DrawingGame 
                      key={`drawing-${partidaId}-${equipoNumero}`}
                      gameConfig={currentGameInfo}
                      onGameComplete={(result) => {
                        console.log('Dibujo completado:', result);
                      }}
                    />
                  ) : currentGameInfo.name.toLowerCase().includes('memoria') ? (
                    <MemoryGame 
                      key={`memory-${partidaId}-${equipoNumero}`}
                      gameConfig={currentGameInfo} 
                      onGameComplete={(result) => {
                        console.log('Juego completado:', result);
                      }}
                    />
                  ) : currentGameInfo.name.toLowerCase().includes('ahorcado') ? (
                    <HangmanGame 
                      key={`hangman-${partidaId}-${equipoNumero}`}
                      gameConfig={currentGameInfo} 
                      onGameComplete={(result) => {
                        console.log('Juego completado:', result);
                      }}
                    />
                  ) : currentGameInfo.name.toLowerCase().includes('rompecabezas') ? (
                    <PuzzleGame 
                      key={`puzzle-${partidaId}-${equipoNumero}`}
                      gameConfig={currentGameInfo} 
                      onGameComplete={(result) => {
                        console.log('Rompecabezas completado:', result);
                      }}
                    />
                  ) : (
                    <div className="game-not-implemented">
                      <h3>Juego {currentGameInfo.name} en desarrollo</h3>
                      <p>Este juego estará disponible pronto</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="waiting-message">
                  <h2>Sala de Espera</h2>
                  <p>Esperando que el profesor inicie los juegos...</p>
                </div>
              )}
          </div>
          
        </div>    

        {/* Panel de información */}
        <div className="info__panel">
          {currentGameInfo ? (
            <>
              <div className="info__section">
                <div className="section__header">
                  <h3>Juego Actual: <br></br> {currentGameInfo.name} <br></br> {currentGameInfo.icon}</h3>
                </div>                
                <div className="game__info">
                  <p>{currentGameInfo.description}</p>                  
                  <div className="game__details">                   
                    <p><strong>Dificultad:</strong> {currentGameInfo.dificultad}</p>
                    <p><strong>Configuración:</strong> {currentGameInfo.config}</p>
                    {currentGameInfo.name.toLowerCase() === 'dibujo' && (
                      <p><strong>Tema:</strong> {currentGameInfo.tema}</p>
                    )}     
                  </div>
                </div>
              </div>                  
              <div className="info__section">
                <div className="section__header">
                  <h3>Miembros del Equipo</h3>
                </div>                
                <ul className="section__members">
                  {teamMembers.map((member, index) => (
                    <li key={index}>
                      {member.fullName} {member.userId === userId && "(Tú)"}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="info__section">
              <div className="section__header">
                <h3>Información</h3>
              </div>              
              <p>Esperando a que todos los miembros se unan al equipo...</p>
            </div>
          )}

          <div className="info__section">
            <div className="section__header">
              <h3>Tiempo Restante</h3>
            </div>            
            <div className="time-display-container">
              <div className={`time-display ${timer.remaining <= 30 && timer.active ? 'low-time' : ''}`}>
                {timer.active ? formatTime(timer.remaining) : '--:--'}
                <div className="time-progress-bar">
                  <div 
                    className={`time-progress-fill ${timer.remaining <= 30 && timer.active ? 'low-time' : ''}`}
                    style={{ width: `${getTimePercentage()}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        
          <button 
            className="help__button"
            onClick={showHelpModal}
          >
            <i className="fas fa-question-circle"></i> Ayuda
          </button>
        </div>       
      </div>
    </LayoutSimulation>
  );
};

export default TeamRoom;