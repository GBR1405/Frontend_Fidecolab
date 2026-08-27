import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useParams, useNavigate, Link  } from 'react-router-dom';
import Swal from 'sweetalert2';
import "../styles/simulationComponents.css";
import "../styles/animationRecharge.css";
import "../styles/simulationLayout.css";
import Cookies from "js-cookie";

const apiUrl = process.env.REACT_APP_API_URL;
const token = Cookies.get("authToken");

const WaitingRoom = () => {
  const socket = useSocket(); // Obtener la instancia de Socket.IO
  const { partidaId } = useParams(); // Obtener el partidaId de la URL.
  const navigate = useNavigate(); // Para redirigir al usuario
  const [users, setUsers] = useState([]); // Estado para almacenar la lista de usuarios
  const audioRef = useRef(null); // Referencia al elemento de audio

  // Obtener el ID, nombre completo y rol del usuario desde el localStorage
  const userId = localStorage.getItem('userId');
  const userFullName = localStorage.getItem('userFullName');
  const userRole = localStorage.getItem('role'); // Obtener el rol del usuario
  const [visibleTeams, setVisibleTeams] = useState([]);
  
  const [teamGroups, setTeamGroups] = useState({});

  useEffect(() => {
      if (!socket || !partidaId) return;
    
      // 🔍 Verificar estado de la partida antes de ejecutar lógica
      const verificarEstadoPartida = async () => {
        try {
          const res = await fetch(`${apiUrl}/check-activity`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ partidaId })
          });
    
          const data = await res.json();
    
          if (data.isFinished) {
            window.location.href = `/resultados/${partidaId}`;
            return;
          }
    
          console.log('Partida activa, obteniendo configuración...');
        } catch (error) {
          console.error('Error al verificar estado de la partida:', error);
        }
      };
    
      
    
      verificarEstadoPartida(); // Llamado antes del emit
    }, [socket, partidaId]);


  // Función para obtener el número de equipo del estudiante
  const fetchTeamNumber = async () => {
    try {
        const response = await fetch(`${apiUrl}/checkgroup`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Error al obtener el número de equipo');
        }

        const data = await response.json();

        const { isParticipant, partidaId, equipoNumero } = data;

        if (isParticipant && equipoNumero !== null) {
            return { partidaId, equipoNumero };
        } else {
            console.error('El estudiante no está en una partida activa o no tiene equipo asignado.');
            return null;
        }
    } catch (error) {
        console.error('Error al obtener el número de equipo:', error);
        return null;
    }
};

  // Unirse a la sala cuando el componente se monta
  useEffect(() => {
    if (socket && partidaId && userId && userFullName) {
      // Unirse a la sala con el ID y el nombre completo
      socket.emit('JoinRoom', partidaId, { userId, fullName: userFullName, role: userRole });

      if (socket && partidaId) {
        socket.emit('GetGroupStructure', parseInt(partidaId), (response) => {
          if (response.success) {
            setTeamGroups(response.teams);
          } else {
            console.error('Error al obtener los grupos:', response.error);
          }
        });
      }

  
      // Escuchar eventos de la sala
      socket.on('UpdateUsers', (usuarios) => {
        // Eliminar duplicados basados en userId o fullName
        const usuariosUnicos = usuarios.reduce((acc, current) => {
          const x = acc.find(item => 
            item.userId === current.userId || 
            item.fullName === current.fullName
          );
          if (!x) {
            return acc.concat([current]);
          } else {
            return acc;
          }
        }, []);
  
        // Reproducir el sonido cuando un nuevo usuario se une
        if (usuariosUnicos.length > users.length) {
          if (audioRef.current) {
            audioRef.current.play();
          }
        }

        socket.on('StartTimer', () => {
          showSweetAlertTimer(); // Mostrar el temporizador en todos los usuarios
        });
  
  
        setUsers(usuariosUnicos);
        console.log('USERS ACTUALIZADOS:', usuariosUnicos);
      });
  
      // Limpiar listeners al desmontar el componente
      return () => {
        socket.off('UpdateUsers');
        socket.off('StartTimer');
      };
    }
  }, [socket, partidaId, userId, userFullName, userRole]);

  useEffect(() => {
  console.log('GRUPOS:', teamGroups);
}, [teamGroups]);

  const isUserConnected = (userId) => {
  return users.some(u => Number(u.userId) === Number(userId));
};

  const getUniqueUsers = (users) => {
    const uniqueUsers = [];
    const seen = new Set();
    
    for (const user of users) {
      const identifier = user.userId || user.fullName;
      if (!seen.has(identifier)) {
        seen.add(identifier);
        uniqueUsers.push(user);
      }
    }
    
    return uniqueUsers;
  };
  
  // Filtrar la lista de usuarios para excluir al profesor y asegurar unicidad
  const filteredUsers = getUniqueUsers(
    users.filter(user => user.role !== 'Profesor')
  );

  // Cantidad de espacios a mostrar por grupo: se basa en el grupo con más jugadores,
  // ya que los equipos ahora pueden tener tamaños distintos (2 a 10 según la personalización)
  const maxTeamSize = Object.values(teamGroups).reduce(
    (max, members) => Math.max(max, (members || []).length),
    0
  ) || 4;

  // Habilitar el botón "Iniciar Partida" si hay al menos 3 usuarios conectados
  const isStartButtonEnabled = filteredUsers.length >= 1;

  // Función para redirigir a los estudiantes después del temporizador
    const handleTimerComplete = async () => {
      if (userRole === 'Profesor') {
        navigate(`/professor-dashboard/${partidaId}`);
      } else {
        const teamInfo = await fetchTeamNumber();
        if (teamInfo) {
          navigate(`/team-room/${teamInfo.partidaId}/${teamInfo.equipoNumero}`);
        }
      }
    };

    useEffect(() => {
  if (Object.keys(teamGroups).length > 0) {
    // Mostrar equipos uno por uno con intervalo de 200ms
    Object.keys(teamGroups).forEach((teamNumber, index) => {
      setTimeout(() => {
        setVisibleTeams(prev => [...prev, teamNumber]);
      }, index * 135);
    });
  }
}, [teamGroups]);

  // Función para mostrar el countdown "Listos, 3, 2, 1, ¡Empezamos!" antes de iniciar la partida
  const showSweetAlertTimer = () => {
    const morphDuration = 3000; // debe coincidir con la duración usada en las animaciones de simulationLayout.css
    const holdAfterFinish = 1000; // tiempo extra mostrando "¡Empezamos!" antes de redirigir
    const textSwapAt = morphDuration * 0.95; // justo antes de que el texto reaparezca (keyframe countdownHideText al 96%)

    Swal.fire({
      html: `
        <div class="countdown-stage">
        <div class="countdown">
          <div class="countdown__colored-blocks">
            <div class="countdown__colored-blocks-rotater">
              <div class="countdown__colored-block"></div>
              <div class="countdown__colored-block"></div>
              <div class="countdown__colored-block"></div>
            </div>
            <div class="countdown__colored-blocks-inner"></div>
            <div class="countdown__text">Listos</div>
          </div>
          <div class="countdown__inner">
            <svg class="countdown__numbers" viewBox="0 0 100 100">
              <defs>
                <path class="countdown__num-path-1" d="M40,28 55,22 55,78"/>
                <path class="countdown__num-join-1-2" d="M55,78 55,83 a17,17 0 1,0 34,0 a20,10 0 0,0 -20,-10"/>
                <path class="countdown__num-path-2" d="M69,73 l-35,0 l30,-30 a16,16 0 0,0 -22.6,-22.6 l-7,7"/>
                <path class="countdown__num-join-2-3" d="M28,69 Q25,44 34.4,27.4"/>
                <path class="countdown__num-path-3" d="M30,20 60,20 40,50 a18,15 0 1,1 -12,19"/>
              </defs>
              <path class="countdown__numbers-path"
                    d="M-10,20 60,20 40,50 a18,15 0 1,1 -12,19
                       Q25,44 34.4,27.4
                       l7,-7 a16,16 0 0,1 22.6,22.6 l-30,30 l35,0 L69,73
                       a20,10 0 0,1 20,10 a17,17 0 0,1 -34,0 L55,83
                       l0,-61 L40,28" />
            </svg>
          </div>
        </div>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      backdrop: 'rgba(8, 6, 28, 0.92)',
      background: 'transparent',
      customClass: {
        popup: 'countdown-popup'
      },
      didOpen: () => {
        const textEl = Swal.getPopup().querySelector('.countdown__text');

        setTimeout(() => {
          textEl.textContent = '¡Empezamos!';
        }, textSwapAt);

        setTimeout(() => {
          Swal.close();
        }, morphDuration + holdAfterFinish);
      },
      willClose: () => {
        handleTimerComplete();
      }
    });
  };

  // Función para iniciar la partida (solo para el profesor)
  const handleStartGame = () => {
    if (isStartButtonEnabled && userRole === 'Profesor') {
      socket.emit('StartGame', partidaId); // Notificar al servidor que la partida ha comenzado
      console.log('Partida iniciada');
    }
  };

  useEffect(() => {
  if (socket && users.length > 0) {
    const last = users[users.length - 1];
    if (last && last.fullName !== userFullName) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `${last.fullName} se ha conectado`,
        showConfirmButton: false,
        timer: 2000
      });
    }
  }
}, [users]);


  return (
    <div className="body__room">
      <header className="header">
        <Link to="/" className="logo__link">
          <div className="logo__image">
            <img 
              className="image__source" 
              src="https://i.postimg.cc/NGzXwBp6/logo.png" 
              alt="Logo institución" 
            />
          </div>
          <div>
            <h2 className="logo__text">FideColab</h2>
          </div>
        </Link>
        <div className="header__title">
          <h1 className="title__text">Sala de Espera</h1>
        </div>
        <div className="header__profile">
          {userRole === 'Profesor' && (
            <button
              className="profile__text_S"
              disabled={!isStartButtonEnabled}
              onClick={handleStartGame}
            >
              {isStartButtonEnabled ? (
                <>
                  <i className="fa-solid fa-play"></i> Iniciar Partida
                </>
              ) : (
                <>
                  <i className="fa-solid fa-hourglass-half"></i> Esperando jugadores...
                </>
              )}
            </button>
          )}
        </div>
      </header>     
      <main className="main">
        <section className="room__container">
          {/* #CAMBIO Inicio del codigo agregado */}
          <div className="container__background">
            <div className="background__content">
              {Object.entries(teamGroups).map(([teamNumber, members]) => (
                <div 
                  className={`content__widget ${visibleTeams.includes(teamNumber) ? 'pop-animation' : ''}`}
                  key={teamNumber}
                  style={{ display: visibleTeams.includes(teamNumber) ? 'grid' : 'none' }}
                >
                <div className="content__widget" key={teamNumber}>
                  <div className="widget__title">
                    <h3>Grupo {teamNumber}</h3>
                  </div>
                  <div className="widget__data">
                    {Array.from({ length: maxTeamSize }).map((_, index) => {
                      const user = members[index];
                      return (
                        <div className="data__player" key={index}>
                          {user ? (
                            <>
                              <span className="player__text" title={user.fullName}>
                                {user.fullName}
                              </span>
                              <span
                                className={`connection-dot ${isUserConnected(user.userId) ? 'dot-online' : 'dot-offline'}`}
                                title={isUserConnected(user.userId) ? 'Conectado' : 'Desconectado'}
                              ></span>
                            </>
                          ) : (
                            <>
                              <span className="player__text">[Vacío]</span>
                              <i className="fa-regular fa-circle not-connected"></i>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                </div>
              ))}
            </div>
          </div>
          {/* #CAMBIO Fin del codigo agregado */}
          <div className="container__information">
            <div className="information__title">
              <h3>Información</h3>
            </div>
            <div className="information__description">
              <h3>Descripción</h3>
              <p>
                Esta es la sala de espera. Espera a que todos tus compañeros se conecten. 
                Cuando estén todos, el profesor podrá iniciar la partida.
              </p>
              <p>
                <strong>Estudiantes conectados:</strong> {filteredUsers.length}
              </p>
              {userRole === 'Profesor' && (
                <p className="teacher-note">
                  <i className="fa-solid fa-chalkboard-user"></i> Eres el profesor. 
                  Podrás iniciar la partida cuando todos los estudiantes estén conectados.
                </p>
              )}
            </div>
            <div className="information__button">
              <button className="button__help">
                <i className="fa-solid fa-question-circle"></i> Ayuda
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default WaitingRoom;