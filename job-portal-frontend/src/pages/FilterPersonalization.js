import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import "../styles/professorComponents.css";
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import LayoutProfessor from "../components/Layout";
import Cookies from "js-cookie";
import { FaEdit, FaTrash, FaTimes, FaUsers, FaSlidersH, FaGripLines } from "react-icons/fa";
import { useSocket } from '../context/SocketContext';


const token = Cookies.get("authToken");
const apiUrl = process.env.REACT_APP_API_URL;

const MIN_TEAM_SIZE = 2;
const MAX_TEAM_SIZE = 10;

const DIFICULTAD_LABELS = {
    1: "Fácil",
    2: "Medio",
    3: "Difícil"
};

// Réplica en el cliente del algoritmo de distribución del backend, solo para mostrar una vista previa.
const previewTeamSizes = (totalEstudiantes, teamSize) => {
    const T = Math.min(MAX_TEAM_SIZE, Math.max(MIN_TEAM_SIZE, Number(teamSize) || 4));
    const N = Number(totalEstudiantes) || 0;

    if (N <= 0) return [];
    if (N <= T) return [N];

    const numFullGroups = Math.floor(N / T);
    const remainder = N % T;

    if (remainder === 0) {
        return Array(numFullGroups).fill(T);
    }

    const untouched = numFullGroups - 1;
    const sizes = Array(untouched).fill(T);
    const combined = T + remainder;

    if (combined >= MIN_TEAM_SIZE * 2) {
        const half = Math.floor(combined / 2);
        sizes.push(half, combined - half);
    } else {
        sizes.push(combined);
    }

    return sizes;
};

const FilterPersonalization = () => {
    const navigate = useNavigate(); // Hook para redirección
    const [personalizations, setPersonalizations] = useState([]); // Estado para las personalizaciones
    const [gruposDisponibles, setGruposDisponibles] = useState([]); // Estado para los grupos disponibles
    const [searchTerm, setSearchTerm] = useState(""); // Estado para el filtro por nombre
    const [gameCount, setGameCount] = useState("todos"); // Estado para el filtro de cantidad de juegos
    const socket = useSocket();

    // Estado del modal de inicio de partida
    const [allStudents, setAllStudents] = useState([]);
    const [showStartModal, setShowStartModal] = useState(false);
    const [activePersonalization, setActivePersonalization] = useState(null);
    const [personalizationDetails, setPersonalizationDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [selectedGrupoId, setSelectedGrupoId] = useState("");
    const [distributionMode, setDistributionMode] = useState("auto"); // 'auto' | 'custom'
    const [teamSize, setTeamSize] = useState(4);
    const [customTeams, setCustomTeams] = useState([[], []]);
    const [searchStudent, setSearchStudent] = useState("");
    const [filterGroupCustom, setFilterGroupCustom] = useState("all");

    // Cargar todos los estudiantes del profesor (para el conteo por grupo y el modo personalizado)
    useEffect(() => {
        const fetchAllStudents = async () => {
            try {
                const response = await fetch(`${apiUrl}/get-students`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setAllStudents(data.estudiantes || []);
                } else {
                    console.error("Error al obtener los estudiantes del profesor");
                }
            } catch (error) {
                console.error("Error al obtener los estudiantes del profesor:", error);
            }
        };

        fetchAllStudents();
    }, [token]);

    // Cargar personalizaciones
    useEffect(() => {
        const fetchPersonalizations = async () => {
            try {
                const response = await fetch(`${apiUrl}/obtener-personalizaciones`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setPersonalizations(data);  // Actualiza el estado con los datos de personalización
                } else {
                    console.error('Error en la respuesta del servidor:', response.status);
                }
            } catch (error) {
                console.error('Error al obtener las personalizaciones:', error);
            }
        };

        fetchPersonalizations();
    }, [token]);

    useEffect(() => {
        const fetchGrupos = async () => {
            try {
                const response = await fetch(`${apiUrl}/obtener-cursosVinculados`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
        
                if (response.ok) {
                    const data = await response.json();
                    setGruposDisponibles(data); // Guarda los grupos en el estado
                } else {
                    console.error("Error al obtener los grupos");
                }
            } catch (error) {
                console.error("Error al obtener los grupos:", error);
            }
        };

        fetchGrupos();
    }, [token]);

    const fetchPersonalizationDetails = async (personalizationId) => {
        setLoadingDetails(true);
        try {
            const response = await fetch(`${apiUrl}/personalizacion-por-id`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: personalizationId })
            });

            const data = await response.json();
            setPersonalizationDetails(data.success ? data.personalizacion : null);
        } catch (error) {
            console.error('Error al obtener el detalle de la personalización:', error);
            setPersonalizationDetails(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleStartGame = (personalization) => {
        setActivePersonalization(personalization);
        setSelectedGrupoId("");
        setDistributionMode("auto");
        setTeamSize(4);
        setCustomTeams([[], []]);
        setSearchStudent("");
        setFilterGroupCustom("all");
        setPersonalizationDetails(null);
        setShowStartModal(true);
        fetchPersonalizationDetails(personalization.Personalizacion_ID_PK);
    };

    const closeStartModal = () => {
        setShowStartModal(false);
        setActivePersonalization(null);
    };

    // --- Utilidades del modo "grupo existente" ---
    const selectedGrupoObj = gruposDisponibles.find(
        (grupo) => String(grupo.GruposEncargados_ID_PK) === String(selectedGrupoId)
    );

    const grupoTotalEstudiantes = selectedGrupoObj
        ? allStudents.filter(
              (est) =>
                  String(est.Codigo_Curso) === String(selectedGrupoObj.Codigo_Curso) &&
                  String(est.Codigo_Grupo) === String(selectedGrupoObj.Codigo_Grupo)
          ).length
        : 0;

    const distribucionPreview = previewTeamSizes(grupoTotalEstudiantes, teamSize);

    // --- Utilidades del modo "grupos personalizados" ---
    const assignedStudentIds = new Set(customTeams.flat());

    const groupOptionsForFilter = [];
    const seenGroupKeys = new Set();
    allStudents.forEach((est) => {
        const key = `${est.Codigo_Curso}|${est.Codigo_Grupo}`;
        if (!seenGroupKeys.has(key)) {
            seenGroupKeys.add(key);
            groupOptionsForFilter.push({ key, label: `${est.Codigo_Curso} - G${est.Codigo_Grupo}` });
        }
    });

    const filteredPoolStudents = allStudents.filter((est) => {
        if (assignedStudentIds.has(est.Usuario_ID_PK)) return false;
        const term = searchStudent.trim().toLowerCase();
        const matchesSearch =
            !term ||
            `${est.Nombre} ${est.Apellido1} ${est.Apellido2} ${est.Correo}`.toLowerCase().includes(term);
        const matchesGroup =
            filterGroupCustom === "all" || `${est.Codigo_Curso}|${est.Codigo_Grupo}` === filterGroupCustom;
        return matchesSearch && matchesGroup;
    });

    const getStudentById = (id) => allStudents.find((est) => est.Usuario_ID_PK === id);

    const addCustomTeam = () => setCustomTeams((prev) => [...prev, []]);

    const removeCustomTeam = (teamIndex) => {
        setCustomTeams((prev) => prev.filter((_, i) => i !== teamIndex));
    };

    const removeStudentFromTeam = (teamIndex, studentId) => {
        setCustomTeams((prev) =>
            prev.map((team, i) => (i === teamIndex ? team.filter((id) => id !== studentId) : team))
        );
    };

    const handleDragStartStudent = (e, studentId) => {
        e.dataTransfer.setData('text/plain', String(studentId));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDropOnTeam = (e, teamIndex) => {
        e.preventDefault();
        const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (isNaN(id)) return;
        setCustomTeams((prev) => {
            const next = prev.map((team) => team.filter((sId) => sId !== id));
            next[teamIndex] = [...next[teamIndex], id];
            return next;
        });
    };

    const handleDropOnPool = (e) => {
        e.preventDefault();
        const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (isNaN(id)) return;
        setCustomTeams((prev) => prev.map((team) => team.filter((sId) => sId !== id)));
    };

    const handleConfirmStart = () => {
        if (!selectedGrupoId) {
            Swal.fire('Falta información', 'Selecciona un grupo para iniciar la partida.', 'warning');
            return;
        }

        let distConfig = {};

        if (distributionMode === "auto") {
            const size = Number(teamSize);
            if (!size || size < MIN_TEAM_SIZE || size > MAX_TEAM_SIZE) {
                Swal.fire('Cantidad inválida', `La cantidad de estudiantes por equipo debe estar entre ${MIN_TEAM_SIZE} y ${MAX_TEAM_SIZE}.`, 'warning');
                return;
            }
            if (grupoTotalEstudiantes < MIN_TEAM_SIZE) {
                Swal.fire('Grupo sin estudiantes', 'El grupo seleccionado no tiene suficientes estudiantes para iniciar una partida.', 'warning');
                return;
            }
            distConfig = { teamSize: size };
        } else {
            const equiposValidos = customTeams.filter((team) => team.length > 0);
            const equiposInvalidos = equiposValidos.filter((team) => team.length < MIN_TEAM_SIZE);

            if (equiposValidos.length === 0) {
                Swal.fire('Equipos vacíos', 'Arrastra al menos dos estudiantes a un equipo para continuar.', 'warning');
                return;
            }
            if (equiposInvalidos.length > 0) {
                Swal.fire('Equipos incompletos', `Cada equipo debe tener al menos ${MIN_TEAM_SIZE} estudiantes. Ajusta los equipos marcados en rojo.`, 'warning');
                return;
            }
            distConfig = { customGroups: equiposValidos };
        }

        const personalization = activePersonalization;
        const grupoID = selectedGrupoId;
        setShowStartModal(false);
        setActivePersonalization(null);
        startGameWithGroup(personalization, grupoID, distConfig);
    };

    const handleDeletePersonalization = async (personalizationId) => {
        Swal.fire({
            title: `¿Desea borrar la personalización?`,
            text: "Nota: Esto es un borrado permanente.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            reverseButtons: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                // Mostrar SweetAlert de carga
                Swal.fire({
                    title: "Eliminando...",
                    text: "Por favor espere",
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                try {
                    const response = await fetch(`${apiUrl}/eliminar_personalizacion`, {
                        method: "DELETE",
                        credentials: "include",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ personalizationId })
                    });

                    Swal.close(); // Cierra el Swal de carga

                    if (response.ok) {
                        Swal.fire({
                            title: "¡Eliminado!",
                            text: "La personalización fue eliminada correctamente.",
                            icon: "success",
                            timer: 2000,
                            showConfirmButton: false
                        });

                        // Actualizar la lista eliminando el item
                        setPersonalizations(prev =>
                            prev.filter(p => p.Personalizacion_ID_PK !== personalizationId)
                        );
                    } else {
                        Swal.fire({
                            title: "Error",
                            text: "No se pudo eliminar la personalización.",
                            icon: "error"
                        });
                    }
                } catch (error) {
                    console.error("Error al eliminar personalización:", error);
                    Swal.close(); // Asegura que se cierre el loader si hay error
                    Swal.fire({
                        title: "Error",
                        text: "Hubo un problema al eliminar la personalización.",
                        icon: "error"
                    });
                }
            }
        });
    };


    
    const startGameWithGroup = async (personalization, grupoID, distConfig = {}) => {
  try {
    Swal.fire({
      title: 'Iniciando partida...',
      html: 'Por favor espera un momento',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const response = await fetch(`${apiUrl}/start-simulation`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizationId: personalization.Personalizacion_ID_PK,
        grupoID: grupoID,
        ...distConfig
      })
    });

    const data = await response.json();
    Swal.close();

    const status = data.status;
    const partidaId = data.partidaId;
    const existingGameId = data.existingGameId;

    console.log('Respuesta del servidor:', data);

    if (status === 1) { // Partida vencida
      await handleFinishGame(partidaId, 'La partida anterior estaba vencida y fue cerrada automáticamente, una nueva partida a sido iniciada, disfruta!.', 'info');
      await startNewGame(personalization, grupoID, distConfig);

    } else if (status === 2) { // Partida activa
      const confirm = await Swal.fire({
        title: 'Partida en curso',
        text: 'Ya tienes una partida activa. ¿Deseas finalizarla?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, finalizar',
        cancelButtonText: 'No'
      });

      if (confirm.isConfirmed) {
        // Obtener configuración antes de finalizar
        await handleFinishGame(
            existingGameId || partidaId, 
            `
            <div style="text-align: center;">
                <h3 style="color: #28a745; margin-bottom: 10px;">¡Cambio realizado!</h3>
                <p style="margin-bottom: 5px;">✅ Partida anterior <strong>cerrada</strong></p>
                <p style="margin-bottom: 15px;">🎮 Nueva partida <strong>iniciada</strong> con diferente equipo</p>
                <p style="font-size: 14px; color: #6c757d;">
                La simulación está lista para comenzar
                </p>
            </div>
            `,
            'success'
            );
        await startNewGame(personalization, grupoID, distConfig);
      } else {
        Swal.fire('Información', 'La partida existente no fue cancelada.', 'info');
      }
      
    } else if (status === 3) { // Nueva partida
      Swal.fire('Partida Iniciada', 'La partida se ha iniciado correctamente.', 'success');
      
    } else {
      Swal.fire('Error', data.message || 'Respuesta inesperada del servidor.', 'error');
    }

  } catch (error) {
    console.error('Error al iniciar la simulación:', error);
    Swal.close();
    Swal.fire('Error', 'Hubo un problema al iniciar la simulación.', 'error');
  }
};

// Función auxiliar para manejar el cierre de partidas
const handleFinishGame = (partidaId, message, icon) => {
  return new Promise((resolve) => {
    Swal.fire({
      title: 'Procesando cambio...',
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false
    });

    // Primero obtener la configuración de la partida
    const getGameConfig = () => {
      return new Promise((resolveConfig, rejectConfig) => {
        if (!socket.connected) {
          socket.once('connect', () => {
            socket.emit('getGameConfig', partidaId, resolveConfig);
          });
        } else {
          socket.emit('getGameConfig', partidaId, resolveConfig);
        }
      });
    };

    const handleSocketResponse = (response) => {
      console.log('Respuesta de finishGame:', response);
      if (response.error) {
        Swal.fire('Error', `No se pudo finalizar la partida: ${response.error}`, 'error');
      } else {
        Swal.fire('Partida Finalizada', message, icon);
      }
      resolve();
    };

    // Flujo completo:
    getGameConfig()
      .then(config => {
        console.log('Configuración obtenida:', config);
        
        // Verificar si hay una partida activa
        if (!config || !config.juegos) {
          throw new Error('No se pudo obtener la configuración de la partida');
        }

        // Ahora emitir finishGame con la configuración obtenida
        if (!socket.connected) {
          socket.once('connect', () => {
            console.log('[Socket] Conectado, emitiendo finishGame');
            socket.emit('finishGame', partidaId, handleSocketResponse);
          });
        } else {
          socket.emit('finishGame', partidaId, handleSocketResponse);
        }
      })
      .catch(error => {
        console.error('Error al obtener configuración:', error);
        Swal.fire('Error', 'No se pudo obtener la configuración de la partida', 'error');
        resolve();
      });
  });
};

// Función auxiliar para iniciar nueva partida después de cerrar una existente
const startNewGame = async (personalization, grupoID, distConfig = {}) => {
  try {
    const response = await fetch(`${apiUrl}/start-simulation`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizationId: personalization.Personalizacion_ID_PK,
        grupoID: grupoID,
        ...distConfig
      })
    });

    const data = await response.json();
    
    if (data.status === 3) {
      Swal.fire('Partida Iniciada', 'La nueva partida se ha iniciado correctamente.', 'success');
    } else {
      Swal.fire('Error', 'No se pudo iniciar la nueva partida.', 'error');
    }
  } catch (error) {
    console.error('Error al iniciar nueva partida:', error);
    Swal.fire('Error', 'Hubo un problema al iniciar la nueva partida.', 'error');
  }
};



    const handleCreateNew = (e) => {
        e.preventDefault();
        Swal.fire({
          title: '¿Estás seguro?',
          text: '¿Quieres crear una nueva personalización?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, crear',
          cancelButtonText: 'Cancelar',
          reverseButtons: true,
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = '/simulations/editor';
          }
        });
    };

    const handleEditPersonalization = async (personalizationId) => {
        try {
            const token = Cookies.get("authToken");
            
            // Usar el nuevo endpoint que obtiene por ID
            const response = await fetch(`${apiUrl}/personalizacion-por-id`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: personalizationId })
            });
    
            const data = await response.json();
            
            if (data.success) {
                window.location.href = `/editar-personalizacion/${personalizationId}`;
            } else {
                Swal.fire("Error", data.error || "No se pudo obtener la personalización", "error");
            }
        } catch (error) {
            console.error("Error al obtener personalización:", error);
            Swal.fire("Error", "Hubo un error al obtener la personalización", "error");
        }
    };

    // Filtrar las personalizaciones por nombre y cantidad de juegos
    const filteredPersonalizations = personalizations.filter((personalization) => {
        const matchesName = personalization.Nombre_Personalizacion.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGameCount = gameCount === "todos" || Number(personalization.Total_Juegos) === Number(gameCount);
        return matchesName && matchesGameCount;
    });

    return (
        <LayoutProfessor>
            <section className="selection__container">
                <div className="container__title">
                    <h3>Personalizar</h3>
                </div>
                <div className="container__content">
                    <div className="content__box">
                        <div className="box__title">
                            <h3>Filtros</h3>
                        </div>
                        <div className="box__left">
                            <div className="box__text">
                                <div className="text__shape">
                                    <label>Nombre</label>
                                    <input
                                        className="shape__input"
                                        type="text"
                                        placeholder="Buscar por nombre"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="text__shape">
                                    <label>Cantidad de juegos</label>
                                    <select
                                        className="shape__input"
                                        value={gameCount}
                                        onChange={(e) => setGameCount(e.target.value)}
                                    >
                                        <option value="todos">Todos</option>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                        <option value="5">5</option>
                                    </select>
                                </div>
                            </div>
                            <div className="box__button" style={{ textDecoration: 'none' }}>
                                <Link to="#" style={{ textDecoration: 'none', color: 'white' }} onClick={handleCreateNew}>
                                    <button type="button" style={{ all: 'unset' }}>Crear uno nuevo</button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Renderización dinámica de las personalizaciones filtradas */}
                    <div className="content__box">
                        <div className="box__title">
                            <h3>Lista de Personalizaciones</h3>
                        </div>
                        <div className="box__right">
                            <div className="right__list">
                                {filteredPersonalizations.map((personalization, index) => (
                                    <div className="list__shape" key={personalization.Personalizacion_ID_PK}>
                                        <div className="list__text">
                                            <div className="list__title">
                                                <h4>{personalization.Nombre_Personalizacion || `Personalización por defecto #${index + 1}`}</h4>
                                            </div>
                                            <div className="list__data">
                                                <div className="data__amount">
                                                    <span>Cantidad de juegos: </span>
                                                    <span>{personalization.Total_Juegos || '0'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="list__button-container">
                                            <div className="list__button">
                                                <button type="submit" onClick={() => handleStartGame(personalization)}>Iniciar</button>
                                            </div>
                                            <div className="list__button-group">
                                                <div className="list__button list__button-small_Delete">
                                                    <button type="button" onClick={() => handleDeletePersonalization(personalization.Personalizacion_ID_PK)}>
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {showStartModal && (
                <div className="sim-modal-overlay" onClick={closeStartModal}>
                    <div className="sim-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="sim-modal__header">
                            <h3>{activePersonalization?.Nombre_Personalizacion || 'Configuración por defecto'}</h3>
                            <button type="button" className="sim-modal__close" onClick={closeStartModal}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className="sim-modal__body">
                            <div className="sim-modal__left">
                                <h4><FaSlidersH /> Juegos de la partida</h4>
                                {loadingDetails ? (
                                    <p className="sim-modal__hint">Cargando juegos...</p>
                                ) : personalizationDetails?.juegos?.length ? (
                                    <ul className="sim-games-list">
                                        {personalizationDetails.juegos
                                            .slice()
                                            .sort((a, b) => a.Orden - b.Orden)
                                            .map((juego) => (
                                                <li key={juego.ConfiguracionJuego_ID_PK} className="sim-games-list__item">
                                                    <span className="sim-games-list__order">{juego.Orden}</span>
                                                    <div className="sim-games-list__info">
                                                        <span className="sim-games-list__name">{juego.Juego}</span>
                                                        <span className={`sim-difficulty-badge sim-difficulty-badge--${juego.Dificultad}`}>
                                                            {DIFICULTAD_LABELS[juego.Dificultad] || 'N/D'}
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}
                                    </ul>
                                ) : (
                                    <p className="sim-modal__hint">No se encontraron juegos para esta configuración.</p>
                                )}
                            </div>

                            <div className="sim-modal__right">
                                <div className="sim-field">
                                    <label><FaUsers /> Selecciona el grupo</label>
                                    <select
                                        className="sim-select"
                                        value={selectedGrupoId}
                                        onChange={(e) => setSelectedGrupoId(e.target.value)}
                                    >
                                        <option value="">Selecciona un grupo</option>
                                        {gruposDisponibles.map((grupo) => (
                                            <option key={grupo.GruposEncargados_ID_PK} value={grupo.GruposEncargados_ID_PK}>
                                                {grupo.Codigo_Curso} {grupo.Nombre_Curso} - G{grupo.Codigo_Grupo}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedGrupoObj && (
                                        <span className="sim-field__hint">
                                            Total de estudiantes en el grupo: <strong>{grupoTotalEstudiantes}</strong>
                                        </span>
                                    )}
                                </div>

                                <div className="sim-tabs">
                                    <button
                                        type="button"
                                        className={`sim-tabs__btn ${distributionMode === 'auto' ? 'sim-tabs__btn--active' : ''}`}
                                        onClick={() => setDistributionMode('auto')}
                                    >
                                        Distribución automática
                                    </button>
                                    <button
                                        type="button"
                                        className={`sim-tabs__btn ${distributionMode === 'custom' ? 'sim-tabs__btn--active' : ''}`}
                                        onClick={() => setDistributionMode('custom')}
                                    >
                                        Personalizar grupos
                                    </button>
                                </div>

                                {distributionMode === 'auto' ? (
                                    <div className="sim-auto">
                                        <div className="sim-field">
                                            <label>Cantidad de estudiantes por equipo ({MIN_TEAM_SIZE} - {MAX_TEAM_SIZE})</label>
                                            <input
                                                type="number"
                                                min={MIN_TEAM_SIZE}
                                                max={MAX_TEAM_SIZE}
                                                className="sim-select"
                                                value={teamSize}
                                                onChange={(e) => setTeamSize(e.target.value)}
                                            />
                                        </div>
                                        {selectedGrupoObj && distribucionPreview.length > 0 && (
                                            <div className="sim-preview">
                                                <span>
                                                    Se crearán <strong>{distribucionPreview.length}</strong> equipo{distribucionPreview.length !== 1 ? 's' : ''}:
                                                </span>
                                                <div className="sim-preview__chips">
                                                    {distribucionPreview.map((size, idx) => (
                                                        <span key={idx} className="sim-preview__chip">Equipo {idx + 1}: {size}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {selectedGrupoObj && grupoTotalEstudiantes < MIN_TEAM_SIZE && (
                                            <p className="sim-warning">
                                                Este grupo no tiene suficientes estudiantes (mínimo {MIN_TEAM_SIZE}).
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="sim-custom">
                                        <div className="sim-custom__controls">
                                            <input
                                                type="text"
                                                placeholder="Buscar estudiante..."
                                                className="sim-select sim-select--sm"
                                                value={searchStudent}
                                                onChange={(e) => setSearchStudent(e.target.value)}
                                            />
                                            <select
                                                className="sim-select sim-select--sm"
                                                value={filterGroupCustom}
                                                onChange={(e) => setFilterGroupCustom(e.target.value)}
                                            >
                                                <option value="all">Todos los grupos</option>
                                                {groupOptionsForFilter.map((opt) => (
                                                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="sim-custom__board">
                                            <div
                                                className="sim-pool"
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={handleDropOnPool}
                                            >
                                                <h5>Estudiantes disponibles ({filteredPoolStudents.length})</h5>
                                                <div className="sim-pool__list">
                                                    {filteredPoolStudents.map((est) => (
                                                        <div
                                                            key={est.Usuario_ID_PK}
                                                            className="sim-chip"
                                                            draggable
                                                            onDragStart={(e) => handleDragStartStudent(e, est.Usuario_ID_PK)}
                                                        >
                                                            <FaGripLines className="sim-chip__grip" />
                                                            <span>{est.Nombre} {est.Apellido1}</span>
                                                        </div>
                                                    ))}
                                                    {filteredPoolStudents.length === 0 && (
                                                        <span className="sim-modal__hint">No hay estudiantes disponibles con este filtro.</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="sim-teams">
                                                {customTeams.map((team, teamIndex) => (
                                                    <div
                                                        key={teamIndex}
                                                        className={`sim-team ${team.length > 0 && team.length < MIN_TEAM_SIZE ? 'sim-team--invalid' : ''}`}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={(e) => handleDropOnTeam(e, teamIndex)}
                                                    >
                                                        <div className="sim-team__header">
                                                            <span>Equipo {teamIndex + 1} ({team.length})</span>
                                                            <button type="button" onClick={() => removeCustomTeam(teamIndex)}>
                                                                <FaTimes />
                                                            </button>
                                                        </div>
                                                        <div className="sim-team__list">
                                                            {team.map((studentId) => {
                                                                const est = getStudentById(studentId);
                                                                if (!est) return null;
                                                                return (
                                                                    <div
                                                                        key={studentId}
                                                                        className="sim-chip sim-chip--team"
                                                                        draggable
                                                                        onDragStart={(e) => handleDragStartStudent(e, studentId)}
                                                                    >
                                                                        <span>{est.Nombre} {est.Apellido1}</span>
                                                                        <button type="button" onClick={() => removeStudentFromTeam(teamIndex, studentId)}>
                                                                            <FaTimes />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                            {team.length === 0 && (
                                                                <span className="sim-modal__hint">Arrastra estudiantes aquí</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                <button type="button" className="sim-add-team" onClick={addCustomTeam}>
                                                    + Agregar equipo
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="sim-modal__footer">
                            <button type="button" className="sim-btn sim-btn--ghost" onClick={closeStartModal}>Cancelar</button>
                            <button type="button" className="sim-btn sim-btn--primary" onClick={handleConfirmStart}>Iniciar partida</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .sim-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(20, 11, 60, 0.45);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                }

                .sim-modal {
                    background: var(--white-clr, #fffffe);
                    border-radius: 1em;
                    box-shadow: 0px 10px 40px 5px rgba(0, 0, 0, 0.25);
                    width: min(1000px, 100%);
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .sim-modal__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 18px 24px;
                    background: var(--blue-royal-clr, #1935ca);
                    color: white;
                }

                .sim-modal__header h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                }

                .sim-modal__close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 1rem;
                    display: flex;
                    align-items: center;
                }

                .sim-modal__body {
                    display: grid;
                    grid-template-columns: 34% 66%;
                    gap: 20px;
                    padding: 20px 24px;
                    overflow-y: auto;
                }

                .sim-modal__left {
                    background: var(--white-smoke-clr, #fbf9f9);
                    border-radius: 0.8em;
                    padding: 16px;
                    box-shadow: 0px 2px 5px 1px rgba(0, 0, 0, 0.06);
                }

                .sim-modal__left h4 {
                    margin: 0 0 12px 0;
                    color: var(--blue-royal-clr, #1935ca);
                    font-size: 0.95rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .sim-modal__hint {
                    color: var(--primary-text-clr, #696F79);
                    font-size: 0.85rem;
                }

                .sim-games-list {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .sim-games-list__item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: white;
                    border-radius: 0.6em;
                    padding: 10px 12px;
                    box-shadow: 0px 2px 5px 1px rgba(0, 0, 0, 0.06);
                }

                .sim-games-list__order {
                    background: var(--blue-royal-clr, #1935ca);
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 600;
                    flex-shrink: 0;
                }

                .sim-games-list__info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .sim-games-list__name {
                    color: var(--primary-text-clr, #696F79);
                    font-weight: 600;
                    font-size: 0.85rem;
                }

                .sim-difficulty-badge {
                    align-self: flex-start;
                    font-size: 0.7rem;
                    font-weight: 600;
                    padding: 2px 8px;
                    border-radius: 10px;
                    color: white;
                    background: var(--dark-royal-clr, #0d24a1);
                }

                .sim-difficulty-badge--1 { background: #2e9e5b; }
                .sim-difficulty-badge--2 { background: var(--dark-orange-clr, #ce8806); }
                .sim-difficulty-badge--3 { background: #b3261e; }

                .sim-modal__right {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .sim-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .sim-field label {
                    color: var(--blue-royal-clr, #1935ca);
                    font-size: 0.85rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .sim-field__hint {
                    font-size: 0.8rem;
                    color: var(--primary-text-clr, #696F79);
                }

                .sim-select {
                    background: white;
                    padding: 8px 10px;
                    border-radius: 6px;
                    box-shadow: 0px 2px 5px 1px rgba(0, 0, 0, 0.06);
                    border: 1px solid #e5e5e5;
                    color: var(--primary-text-clr, #696F79);
                    font-size: 0.85rem;
                }

                .sim-select--sm {
                    flex: 1;
                }

                .sim-tabs {
                    display: flex;
                    gap: 8px;
                    border-bottom: 2px solid var(--white-smoke-clr, #fbf9f9);
                }

                .sim-tabs__btn {
                    background: none;
                    border: none;
                    padding: 8px 4px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--primary-text-clr, #696F79);
                    border-bottom: 3px solid transparent;
                }

                .sim-tabs__btn--active {
                    color: var(--blue-royal-clr, #1935ca);
                    border-bottom-color: var(--yellow-clr, #f2cb05);
                }

                .sim-auto {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .sim-preview {
                    background: var(--white-smoke-clr, #fbf9f9);
                    border-radius: 0.6em;
                    padding: 10px 12px;
                    font-size: 0.8rem;
                    color: var(--primary-text-clr, #696F79);
                }

                .sim-preview__chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 8px;
                }

                .sim-preview__chip {
                    background: white;
                    border-radius: 12px;
                    padding: 4px 10px;
                    font-size: 0.75rem;
                    box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.08);
                }

                .sim-warning {
                    color: #b3261e;
                    font-size: 0.8rem;
                    margin: 0;
                }

                .sim-custom {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    min-height: 0;
                }

                .sim-custom__controls {
                    display: flex;
                    gap: 8px;
                }

                .sim-custom__board {
                    display: grid;
                    grid-template-columns: 40% 60%;
                    gap: 12px;
                }

                .sim-pool, .sim-teams {
                    background: var(--white-smoke-clr, #fbf9f9);
                    border-radius: 0.6em;
                    padding: 10px;
                    max-height: 320px;
                    overflow-y: auto;
                }

                .sim-pool h5 {
                    margin: 0 0 8px 0;
                    font-size: 0.8rem;
                    color: var(--blue-royal-clr, #1935ca);
                }

                .sim-pool__list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .sim-teams {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .sim-team {
                    background: white;
                    border-radius: 0.6em;
                    padding: 8px;
                    box-shadow: 0px 2px 5px 1px rgba(0, 0, 0, 0.06);
                    border: 2px dashed transparent;
                }

                .sim-team--invalid {
                    border-color: #b3261e;
                }

                .sim-team__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--blue-royal-clr, #1935ca);
                    margin-bottom: 6px;
                }

                .sim-team__header button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--primary-text-clr, #696F79);
                    display: flex;
                }

                .sim-team__list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    min-height: 30px;
                }

                .sim-chip {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: var(--white-smoke-clr, #fbf9f9);
                    border-radius: 6px;
                    padding: 6px 8px;
                    font-size: 0.78rem;
                    color: var(--primary-text-clr, #696F79);
                    cursor: grab;
                }

                .sim-chip--team {
                    background: #eef1ff;
                    justify-content: space-between;
                }

                .sim-chip--team button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #b3261e;
                    display: flex;
                }

                .sim-chip__grip {
                    color: #b7bcc7;
                    font-size: 0.7rem;
                }

                .sim-add-team {
                    align-self: flex-start;
                    background: none;
                    border: 1px dashed var(--blue-royal-clr, #1935ca);
                    color: var(--blue-royal-clr, #1935ca);
                    border-radius: 6px;
                    padding: 6px 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                }

                .sim-modal__footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    padding: 14px 24px;
                    border-top: 1px solid var(--white-smoke-clr, #fbf9f9);
                }

                .sim-btn {
                    padding: 8px 20px;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    border: none;
                }

                .sim-btn--ghost {
                    background: var(--white-smoke-clr, #fbf9f9);
                    color: var(--primary-text-clr, #696F79);
                }

                .sim-btn--primary {
                    background: var(--yellow-clr, #f2cb05);
                    color: white;
                }

                .sim-btn--primary:hover {
                    background: var(--dark-yellow-clr, #dfba00);
                }

                @media (max-width: 720px) {
                    .sim-modal__body {
                        grid-template-columns: 1fr;
                    }
                    .sim-custom__board {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </LayoutProfessor>
    );
};

export default FilterPersonalization;
