import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import Cookies from 'js-cookie';
import CryptoJS from 'crypto-js';
import { useDrag, useDrop } from 'react-dnd';
import "../styles/professorComponents.css";
import LayoutProfessor from "../components/Layout";

const apiURL = process.env.REACT_APP_API_URL;
const secretKey = process.env.REACT_APP_SECRET_KEY;

const CreatePersonalization = ({ personalizacionId }) => {
  const [juegosDisponibles, setJuegosDisponibles] = useState([]);
  const [juegosSeleccionados, setJuegosSeleccionados] = useState([]);
  const [tituloPersonalizacion, setTituloPersonalizacion] = useState("");

  useEffect(() => {
    axios.get(`${apiURL}/tipo-juegos`).then((res) => {
      if (res.data.success) {
        setJuegosDisponibles(res.data.juegos);
      }
    });

    if (personalizacionId) {
      axios
        .get(`${apiURL}/personalizacion?id=${personalizacionId}`)
        .then((res) => {
          if (res.data.success) {
            setJuegosSeleccionados(
              res.data.juegos.sort((a, b) => a.orden - b.orden)
            );
            setTituloPersonalizacion(res.data.titulo || "");
          }
        });
    }
  }, [personalizacionId]);

  const obtenerTemas = async (juegoId) => {
    try {
      const res = await axios.get(`${apiURL}/temas-juego/${juegoId}`);
      return res.data.success ? res.data.temas : [];
    } catch (error) {
      console.error("Error al obtener temas:", error);
      return [];
    }
  };

  const agregarJuego = async (juego) => {
    if (juegosSeleccionados.length >= 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Límite alcanzado',
        text: 'Solo puedes seleccionar hasta 5 juegos',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    const temas = await obtenerTemas(juego.Tipo_Juego_ID_PK);
    const dificultad = juego.Juego === "Dibujo" ? 1 : 1;

    const nuevoJuego = {
      ...juego,
      orden: juegosSeleccionados.length + 1,
      dificultad,
      tema: juego.Juego === "Memoria" ? null : (temas.length > 0 ? temas[0].Tema_Juego_ID_PK : ""),
      temas,
      necesitaSeleccionarImagen: juego.Juego === "Rompecabezas"
    };

    setJuegosSeleccionados(prev => [...prev, nuevoJuego]);

    if (juego.Juego === "Rompecabezas") {
      const index = juegosSeleccionados.length;
      setTimeout(() => {
        const buttons = document.querySelectorAll('.select-image-button');
        if (buttons[index]) {
          buttons[index].click();
        }
      }, 100);
    }
  };

  const actualizarJuego = (index, campo, valor) => {
    setJuegosSeleccionados((prev) => {
      const updatedJuegos = [...prev];
      updatedJuegos[index][campo] = valor;
      
      if (campo === 'tema' && updatedJuegos[index].necesitaSeleccionarImagen) {
        updatedJuegos[index].necesitaSeleccionarImagen = false;
      }
      
      updatedJuegos[index].orden = index + 1;
      return updatedJuegos;
    });
  };

  const eliminarJuego = (index) => {
    setJuegosSeleccionados((prev) => {
      const updatedJuegos = [...prev];
      updatedJuegos.splice(index, 1);
      return updatedJuegos.map((juego, idx) => ({
        ...juego,
        orden: idx + 1
      }));
    });
  };

  const guardarConfiguracion = () => {
    if (tituloPersonalizacion.trim() === "") {
      Swal.fire("Error", "Por favor ingrese un título para la personalización", "error");
      return;
    }

    const userInfoCookie = Cookies.get("IFUser_Info");
    if (!userInfoCookie) {
      Swal.fire("Error", "No se pudo obtener la información del usuario.", "error");
      return;
    }

    try {
      const bytes = CryptoJS.AES.decrypt(userInfoCookie, secretKey);
      const userData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      const usuarioId = userData.id;

      const token = Cookies.get("authToken");

      axios
        .post(`${apiURL}/personalizacion`, {
          personalizacionId,
          usuarioId,
          juegos: juegosSeleccionados.map((juego) => ({
            ...juego,
            tema: juego.Juego === "Memoria" ? null : juego.temas.find((t) => t.Tema_Juego_ID_PK === juego.tema)?.Tema_Juego_ID_PK || juego.tema
          })),
          titulo: tituloPersonalizacion,
        }, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include"
        })
        .then((res) => {
            if (res.data.success) {
              Swal.fire("¡Guardado!", "Configuración guardada exitosamente", "success")
              .then(() => {
                window.location.reload();
            });
            }
          })
          .catch((err) => {
            const errorMessage = err.response && err.response.data && err.response.data.error
              ? err.response.data.error
              : "No se pudo guardar la configuración"; 
            Swal.fire("Error", errorMessage, "error");
          });

    } catch (error) {
      Swal.fire("Error", "Hubo un error al desencriptar la información del usuario.", "error");
    }
  };

  const moveCard = (dragIndex, hoverIndex) => {
    const draggedItem = juegosSeleccionados[dragIndex];
    const updatedJuegos = [...juegosSeleccionados];
    updatedJuegos.splice(dragIndex, 1);
    updatedJuegos.splice(hoverIndex, 0, draggedItem);
    setJuegosSeleccionados(updatedJuegos.map((juego, idx) => ({
      ...juego,
      orden: idx + 1
    })));
  };

  const JuegoCard = ({ index, juego }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [swalInstance, setSwalInstance] = useState(null);
    const imagesPerPage = 4;

    const openModal = () => {
      const totalPages = Math.ceil(juego.temas.length / imagesPerPage);
      
      const modal = Swal.fire({
        title: 'Seleccionar Imagen',
        html: getModalContent(),
        showCancelButton: true,
        cancelButtonText: 'Cerrar',
        showConfirmButton: false,
        allowOutsideClick: true,
        didOpen: () => {
          setupEventListeners();
        },
        willClose: () => {
          setSwalInstance(null);
        }
      });
      
      setSwalInstance(modal);
    };

    const getModalContent = () => {
      const totalPages = Math.ceil(juego.temas.length / imagesPerPage);
      const startIdx = (currentPage - 1) * imagesPerPage;
      const endIdx = startIdx + imagesPerPage;
      const currentImages = juego.temas.slice(startIdx, endIdx);

      return `
        <div class="image-gallery" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; max-height: 60vh; overflow-y: auto;">
          ${currentImages.length > 0 ? 
            currentImages.map((tema) => `
              <div class="image-item" style="text-align: center;">
                <img src="${tema.Contenido}" alt="Tema ${tema.Tema_Juego_ID_PK}" 
                  style="
                    width: 120px; 
                    height: 120px; 
                    cursor: pointer; 
                    border: ${juego.tema === tema.Tema_Juego_ID_PK ? '3px solid #2196F3' : '1px solid #ddd'};
                    border-radius: 8px;
                    object-fit: cover;
                    padding: 2px;
                    transition: all 0.3s;
                  "
                  onmouseover="this.style.transform='scale(1.05)'"
                  onmouseout="this.style.transform='scale(1)'"
                  data-id="${tema.Tema_Juego_ID_PK}" />
              </div>
            `).join('') :
            `<span>No hay temas disponibles</span>`
          }
        </div>
        ${totalPages > 1 ? `
          <div class="pagination" style="margin-top: 20px; display: flex; justify-content: center; align-items: center; gap: 10px;">
            <button id="prevPage" class="swal2-button swal2-cancel" 
              style="padding: 5px 15px; border-radius: 5px;" 
              ${currentPage === 1 ? 'disabled' : ''}>
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span style="margin: 0 5px;">Página ${currentPage} de ${totalPages}</span>
            <button id="nextPage" class="swal2-button swal2-cancel" 
              style="padding: 5px 15px; border-radius: 5px;" 
              ${currentPage === totalPages ? 'disabled' : ''}>
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        ` : ''}
      `;
    };

    const setupEventListeners = () => {
      const items = document.querySelectorAll('.image-item img');
      items.forEach(item => {
        item.addEventListener('click', (e) => {
          const temaId = e.target.dataset.id;
          handleImageSelect(temaId);
        });
      });

      const prevBtn = document.getElementById('prevPage');
      const nextBtn = document.getElementById('nextPage');
      
      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setCurrentPage(prev => Math.max(prev - 1, 1));
          updateModalContent();
        });
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setCurrentPage(prev => Math.min(prev + 1, Math.ceil(juego.temas.length / imagesPerPage)));
          updateModalContent();
        });
      }
    };

    const updateModalContent = () => {
      if (swalInstance) {
        swalInstance.update({
          html: getModalContent()
        }).then(() => {
          setupEventListeners();
        });
      }
    };

    const handleImageSelect = (temaId) => {
      if (temaId) {
        actualizarJuego(index, "tema", temaId);
        swalInstance.close();
      }
    };

    const [, ref] = useDrag({
      type: "JUEGO",
      item: { index, tipoJuegoId: juego.Tipo_Juego_ID_PK },
    });
    
    const [, drop] = useDrop({
      accept: "JUEGO",
      hover: (item) => {
        if (item.index !== index) {
          moveCard(item.index, index);
          item.index = index;
        }
      },
    });

    return (
      <div ref={(node) => ref(drop(node))} className="list__shape">
        <div className="list__image">
          <i className={`fa-solid ${juego.Juego === 'Rompecabezas' ? 'fa-puzzle-piece' : juego.Juego === 'Dibujo' ? 'fa-paintbrush' : juego.Juego === 'Sopa de letras' ? 'fa-a' : 'fa-brain'}`}></i>
        </div>

        <div className="list__text">
          <div className="list__title">
            <h4>{juego.Juego}</h4>
          </div>
          <div className="list__data">
            <span>Tiempo: </span>
            <span>{juego.Juego === 'Rompecabezas' ? '3 minutos' : juego.Juego === 'Dibujo' ? '8 minutos' : '5 minutos'}</span>
          </div>
        </div>

        <div className="list__dificulty">
          {juego.Juego === "Dibujo" ? (
            <select
              value={juego.dificultad}
              onChange={(e) => actualizarJuego(index, "dificultad", e.target.value)}
              className="styled-select"
            >
              <option value="0" disabled selected>Dificultad:</option>
              <option value="1">Fácil (7 min)</option>
              <option value="2">Medio (5 min)</option>
              <option value="3">Difícil (3 min)</option>
            </select>
          ) : (
            <select
              value={juego.dificultad}
              onChange={(e) => actualizarJuego(index, "dificultad", e.target.value)}
              className="styled-select"
            >
              <option value="0" disabled selected>Dificultad:</option>
              <option value="1">Fácil</option>
              <option value="2">Medio</option>
              <option value="3">Difícil</option>
            </select>
          )}
        </div>

        <div className="list__dificulty">
          {juego.Juego === 'Rompecabezas' ? (
            <>
              <button 
                onClick={openModal} 
                className="select-image-button"
                style={{
                  backgroundColor: juego.necesitaSeleccionarImagen ? '#FF5722' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'background-color 0.3s'
                }}
              >
                {juego.necesitaSeleccionarImagen ? 'Seleccionar Imagen' : 'Imagen Seleccionada'}
              </button>
            </>
          ) : (
            <select
              value={juego.tema || ""}
              onChange={(e) => {
                const newTemaId = e.target.value;
                actualizarJuego(index, "tema", newTemaId);
              }}
              className="styled-select"
            >
              {juego.temas.length > 0 ? (
                juego.temas.map((tema) => (
                  <option key={tema.Tema_Juego_ID_PK} value={tema.Tema_Juego_ID_PK}>
                    {tema.Contenido}
                  </option>
                ))
              ) : (
                <option value="">Ningún tema</option>
              )}
            </select>
          )}
        </div>

        <button onClick={() => eliminarJuego(index)} className="list__action__s">
          Eliminar
        </button>
      </div>
    );
  };

  return (
    <LayoutProfessor>
      <section className="create__container">
        <div className="container__title">
          <h3>Personalizar</h3>
        </div>
        <div className="container__options">
          <div className="option__text">
            <span>Nombre:</span>
            <input
              className="text__input"
              type="text"
              placeholder="Ingrese un nombre."
              value={tituloPersonalizacion}
              onChange={(e) => setTituloPersonalizacion(e.target.value)}
            />
          </div>
          <div className="option__button button--second">
            <button type="submit" onClick={guardarConfiguracion}>Guardar Personalización</button>
          </div>
        </div>
        <div className="container__content">
          <div className="content__box">
            <div className="box__title">
              <h3>Orden de los juegos</h3>
            </div>
            <div className="box__order">
              <div className="order__list">
                {juegosSeleccionados.map((juego, index) => (
                  <JuegoCard 
                    key={`juego-${juego.Tipo_Juego_ID_PK}-${index}`}
                    index={index}
                    juego={juego}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="content__box">
            <div className="box__title">
              <h3>Juegos disponibles</h3>
            </div>
            <div className="box__games">
              {juegosDisponibles.map((juego) => (
                <button
                  key={juego.Tipo_Juego_ID_PK}
                  className="game__shape"
                  onClick={() => agregarJuego(juego)}
                  disabled={juegosSeleccionados.length >= 5}
                >
                  <div className="game__image">
                    <i className={`fa-solid ${juego.Juego === 'Rompecabezas' ? 'fa-puzzle-piece' : juego.Juego === 'Dibujo' ? 'fa-paintbrush' : juego.Juego === 'Memoria' ? 'fa-brain' : 'fa-circle-question'}`}></i>
                  </div>
                  <div className="game__text">
                    <h4 className="game__title">{juego.Juego}</h4>
                    <div className="game__description">
                      <span>Tiempo:</span>
                      <span>{juego.Juego === 'Rompecabezas' ? '3 minutos' : juego.Juego === 'Dibujo' ? '8 minutos' : '5 minutos'}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </LayoutProfessor>
  );
};

export default CreatePersonalization;