import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import "../styles/professorComponents.css";
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import LayoutProfessor from "../components/Layout";
import Cookies from "js-cookie";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useSocket } from '../context/SocketContext';


const token = Cookies.get("authToken");
const apiUrl = process.env.REACT_APP_API_URL;

const FilterPersonalization = () => {
    const navigate = useNavigate(); // Hook para redirección
    const [personalizations, setPersonalizations] = useState([]); // Estado para las personalizaciones
    const [gruposDisponibles, setGruposDisponibles] = useState([]); // Estado para los grupos disponibles
    const [searchTerm, setSearchTerm] = useState(""); // Estado para el filtro por nombre
    const [gameCount, setGameCount] = useState("todos"); // Estado para el filtro de cantidad de juegos
    const socket = useSocket();

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

    const handleStartGame = (personalization) => {
        Swal.fire({
            title: '¿Deseas empezar la partida?',
            html: `<p style="margin-top: 10px">Configuración seleccionada: <strong>${personalization.Nombre_Personalizacion || 'Configuración por defecto'}</strong></p>`,
            text: 'Selecciona el grupo con el cual vas a empezar',
            icon: 'question',
            input: 'select',
            inputOptions: gruposDisponibles.reduce((acc, grupo) => {
                acc[grupo.GruposEncargados_ID_PK] = `${grupo.Codigo_Curso} ${grupo.Nombre_Curso} - G${grupo.Codigo_Grupo}`; // Formato solicitado
                return acc;
            }, {}),
            inputPlaceholder: 'Selecciona un grupo',
            showCancelButton: true,
            confirmButtonText: 'Iniciar',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                const grupoSeleccionado = result.value; // El ID del grupo seleccionado
    
                // Validar que personalization y grupoSeleccionado no sean null o undefined
                if (!personalization || !grupoSeleccionado) {
                    Swal.fire({
                        title: 'Error',
                        text: 'La configuración o el grupo seleccionado no son válidos.',
                        icon: 'error',
                        confirmButtonText: 'Aceptar'
                    });
                    return; // Detener la ejecución si hay un error
                }
    
                // Aquí enviarías la configuración y el grupo seleccionado al backend
                startGameWithGroup(personalization, grupoSeleccionado);
            }
        });
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


    
    const startGameWithGroup = async (personalization, grupoID) => {
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
        grupoID: grupoID
      })
    });

    const data = await response.json();
    Swal.close();

    const status = data.status;
    const partidaId = data.partidaId;
    console.log('Respuesta del servidor:', data);

    // Función segura para emitir cuando el socket esté listo
    const emitirFinishGame = () => {
      socket.emit('finishGame', partidaId, (response) => {
        console.log('Respuesta de finishGame:', response);
        Swal.fire('Partida Finalizada', 'La partida anterior fue cerrada automáticamente.', 'info');
      });
    };

    if (status === 1) {
      // Partida vencida, cerrarla automáticamente
      Swal.fire({ title: 'Finalizando partida anterior...', didOpen: () => Swal.showLoading() });

      if (!socket.connected) {
        socket.once('connect', () => {
          console.log('[Socket] Conectado, emitiendo finishGame');
          emitirFinishGame();
        });
      } else {
        emitirFinishGame();
      }

    } else if (status === 2) {
      // Partida activa, preguntar si desea finalizarla
      const confirm = await Swal.fire({
        title: 'Partida en curso',
        text: 'Ya tienes una partida activa. ¿Deseas finalizarla?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, finalizar',
        cancelButtonText: 'No'
      });

      if (confirm.isConfirmed) {
        Swal.fire({ title: 'Finalizando partida...', didOpen: () => Swal.showLoading() });

        if (!socket.connected) {
          socket.once('connect', () => {
            console.log('[Socket] Conectado, emitiendo finishGame');
            socket.emit('finishGame', partidaId, (response) => {
              console.log('Respuesta de finishGame:', response);
              Swal.fire('Partida Finalizada', 'La partida fue cerrada.', 'success');
            });
          });
        } else {
          socket.emit('finishGame', partidaId, (response) => {
            console.log('Respuesta de finishGame:', response);
            Swal.fire('Partida Finalizada', 'La partida fue cerrada.', 'success');
          });
        }
      } else {
        Swal.fire('Información', 'La partida existente no fue cancelada.', 'info');
      }

    } else if (status === 3) {
      // Nueva partida creada exitosamente
      await Swal.fire('Partida Iniciada', 'La partida se ha iniciado correctamente.', 'success');
      console.log('Partida iniciada con ID:', partidaId);
      // Aquí puedes redirigir al juego si lo deseas
    } else {
      Swal.fire('Error', 'Respuesta inesperada del servidor.', 'error');
    }

  } catch (error) {
    console.error('Error al iniciar la simulación:', error);
    Swal.close();
    Swal.fire('Error', 'Hubo un problema al iniciar la simulación.', 'error');
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
                                                <div className="list__button list__button-small">
                                                <button 
                                                    type="submit" 
                                                    onClick={() => handleEditPersonalization(personalization.Personalizacion_ID_PK)}
                                                    >
                                                    <FaEdit />
                                                </button>
                                                </div>
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
        </LayoutProfessor>
    );
};

export default FilterPersonalization;
