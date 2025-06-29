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

    setJuegosSeleccionados((prev) => [
      ...prev,
      {
        ...juego,
        orden: prev.length + 1,
        dificultad,
        tema: juego.Juego === "Memoria" ? null : (temas.length > 0 ? temas[0].Tema_Juego_ID_PK : ""),
        temas,
      },
    ]);
  };

  const actualizarJuego = (index, campo, valor) => {
    setJuegosSeleccionados((prev) => {
      const updatedJuegos = [...prev];
      updatedJuegos[index][campo] = valor;
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
    const [selectedImage, setSelectedImage] = useState(juego.tema);
    const [currentPage, setCurrentPage] = useState(1);
    const imagesPerPage = 4;

    const openModal = () => {
      const totalPages = Math.ceil(juego.temas.length / imagesPerPage);
      const startIdx = (currentPage - 1) * imagesPerPage;
      const endIdx = startIdx + imagesPerPage;
      const currentImages = juego.temas.slice(startIdx, endIdx);

      Swal.fire({
        title: 'Seleccionar Imagen',
        html: `
          <div class="image-gallery" style="display: flex; flex-wrap: wrap; justify-content: center;">
            ${currentImages.length > 0 ? 
              currentImages.map((tema) => `
                <div class="image-item" style="margin: 10px; text-align: center;">
                  <img src="${tema.Contenido}" alt="Tema ${tema.Tema_Juego_ID_PK}" 
                    style="width: 100px; height: 100px; cursor: pointer; border: ${selectedImage === tema.Tema_Juego_ID_PK ? '3px solid #4CAF50' : '1px solid #ddd'}" 
                    data-id="${tema.Tema_Juego_ID_PK}" />
                  <p style="margin-top: 5px; font-size: 12px;">Imagen ${tema.Tema_Juego_ID_PK}</p>
                </div>
              `).join('') :
              `<span>No hay temas disponibles</span>`
            }
          </div>
          ${totalPages > 1 ? `
            <div class="pagination" style="margin-top: 20px; display: flex; justify-content: center; align-items: center;">
              <button id="prevPage" class="swal2-button swal2-cancel" style="margin-right: 10px;" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
              <span style="margin: 0 10px;">Página ${currentPage} de ${totalPages}</span>
              <button id="nextPage" class="swal2-button swal2-cancel" style="margin-left: 10px;" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>
            </div>
          ` : ''}
        `,
        showCancelButton: true,
        cancelButtonText: 'Cerrar',
        showConfirmButton: false,
        allowOutsideClick: true,
        didOpen: () => {
          const items = document.querySelectorAll('.image-item img');
          items.forEach(item => {
            item.addEventListener('click', (e) => {
              const temaId = e.target.dataset.id;
              handleImageSelect(temaId);
              Swal.close();
            });
          });

          const prevBtn = document.getElementById('prevPage');
          const nextBtn = document.getElementById('nextPage');
          
          if (prevBtn) {
            prevBtn.addEventListener('click', () => {
              setCurrentPage(prev => Math.max(prev - 1, 1));
              Swal.close();
              setTimeout(openModal, 100);
            });
          }
          
          if (nextBtn) {
            nextBtn.addEventListener('click', () => {
              setCurrentPage(prev => Math.min(prev + 1, totalPages));
              Swal.close();
              setTimeout(openModal, 100);
            });
          }
        }
      });
    };

    const handleImageSelect = (temaId) => {
      if (temaId) {
        setSelectedImage(temaId);
        actualizarJuego(index, "tema", temaId);
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

    const getSelectedImageUrl = () => {
      if (!selectedImage) return null;
      const tema = juego.temas.find(t => t.Tema_Juego_ID_PK === selectedImage);
      return tema ? tema.Contenido : null;
    };

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
                  backgroundColor: selectedImage ? '#4CAF50' : '',
                  color: selectedImage ? 'white' : '',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {selectedImage ? (
                  <>
                    <span>Imagen seleccionada</span>
                    {getSelectedImageUrl() && (
                      <img 
                        src={getSelectedImageUrl()} 
                        alt="Seleccionada" 
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '4px',
                          objectFit: 'cover'
                        }}
                      />
                    )}
                  </>
                ) : (
                  <span>Seleccionar imagen</span>
                )}
              </button>
            </>
          ) : (
            <select
              value={selectedImage || juego.tema}
              onChange={(e) => {
                const newTemaId = e.target.value;
                actualizarJuego(index, "tema", newTemaId);
                setSelectedImage(newTemaId);
              }}
            >
              {juego.temas.length > 0 ? (
                juego.temas.map((tema) => (
                  <option key={tema.Tema_Juego_ID_PK} value={tema.Tema_Juego_ID_PK}>
                    {tema.Contenido}
                  </option>
                ))
              ) : (
                <option value="null">Ningún tema</option>
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