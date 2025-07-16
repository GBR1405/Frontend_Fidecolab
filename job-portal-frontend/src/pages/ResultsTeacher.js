import React, { useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import "../styles/resultsTeacher.css";
import { useNavigate, Link } from 'react-router-dom';
import Cookies from "js-cookie";

const apiUrl = process.env.REACT_APP_API_URL;

function ResultsTeacher() {
  const [active, setActive] = React.useState(0);
  const [refreshInterval, setRefreshInterval] = React.useState(null);
  const { partidaId } = useParams();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [images, setImages] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      const token = Cookies.get("authToken");
      try {
        const response = await fetch(`${apiUrl}/resultados/${partidaId}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Error al obtener resultados');
        }

        const data = await response.json();
        setResults(data);
        
        // Establecer el equipo seleccionado (primero para profesores, el único para estudiantes)
        if (data.equipo) {
          setSelectedTeam(data.equipo.numero);
        } else if (data.equipos && data.equipos.length > 0) {
          setSelectedTeam(data.equipos[0].equipo);
        }

        // Procesar imágenes de dibujos
        processDrawingImages(data);

      } catch (err) {
        setError(err.message);
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [partidaId]);

  const processDrawingImages = (data) => {
    let drawingImages = [];
    
    // Obtener todos los resultados de juegos de dibujo
    if (data.equipo) {
      // Estudiante
      data.equipo.resultados.forEach(result => {
        if (result.tipoJuego === "Dibujo" && result.comentario?.startsWith("data:image")) {
          drawingImages.push(result.comentario);
        }
      });
    } else if (data.equipos) {
      // Profesor - buscar en todos los equipos
      data.equipos.forEach(team => {
        team.resultados.forEach(result => {
          if (result.tipoJuego === "Dibujo" && result.comentario?.startsWith("data:image")) {
            drawingImages.push(result.comentario);
          }
        });
      });
    }

    // Si no hay dibujos, usar imágenes por defecto
    if (drawingImages.length === 0) {
      drawingImages = [
        'Fidelitas1.jpg',
        'Fidelitas2.png',
        'Fidelitas3.jpg',
        'Ejemplo2.jpg',
        'Ejemplo1.jpg'
      ];
    }

    setImages(drawingImages);
  };

  const handleNextClick = React.useCallback(() => {
    setActive((prev) => (prev + 1 <= images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const handlePrevClick = () => {
    setActive((prev) => (prev - 1 >= 0 ? prev - 1 : images.length - 1));
  };

  React.useEffect(() => {
    const interval = setInterval(handleNextClick, 5000);
    setRefreshInterval(interval);

    return () => clearInterval(interval);
  }, [active, handleNextClick]);

  const formatTime = (seconds) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTotalTime = (results) => {
    if (!results) return "00:00";
    let totalSeconds = 0;
    results.forEach(game => {
      if (game.tiempo && typeof game.tiempo === 'number') {
        totalSeconds += game.tiempo;
      }
    });
    return formatTime(totalSeconds);
  };

  const getTeamResults = () => {
    if (!results) return [];
    
    if (results.equipo) {
      // Estudiante - solo tiene un equipo
      return results.equipo.resultados || [];
    } else if (results.equipos && selectedTeam) {
      // Profesor - buscar el equipo seleccionado
      const team = results.equipos.find(t => t.equipo === selectedTeam);
      return team ? team.resultados : [];
    }
    
    return [];
  };

  const getTeamMembers = () => {
    if (!results) return [];
    
    if (results.equipo) {
      // Estudiante
      return results.equipo.miembros || [];
    } else if (results.equipos && selectedTeam) {
      // Profesor
      const team = results.equipos.find(t => t.equipo === selectedTeam);
      return team ? team.miembros : [];
    }
    
    return [];
  };

  const getTeamAchievements = () => {
    if (!results) return [];
    
    if (results.equipo) {
      // Estudiante
      return results.equipo.logros || [];
    } else if (results.logros && selectedTeam) {
      // Profesor
      return results.logros[selectedTeam] || [];
    }
    
    return [];
  };

  if (loading) return <div className="loading">Cargando resultados...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!results) return <div className="error">No se encontraron resultados</div>;

  return (
    <div className="results__body">    
      <header className="header">
        <Link to="/" className="logo__link">
          <img 
            className="image__source" 
            src="https://i.postimg.cc/NGzXwBp6/logo.png" 
            alt="Logo institución" 
          />
          <div>
            <h2 className="logo__text">FideColab</h2>
          </div>
        </Link>
        <div className="header__title">
          <h1 className="title__text">Resultados</h1>
        </div>
      </header>     
      <main className="main">
        <div className="results__container">
          <div className="container__left">   
            <div className="container__box">
              <div className="box__title">
                <h3>Miembros</h3>
              </div>
              <div className="box__group">
                {getTeamMembers().map((member, index) => (
                  <div key={index} className="group__shape">
                    <h4 className="shape__name">
                      {member.Nombre} {member.Apellido1} {member.Apellido2}
                    </h4>
                  </div>
                ))}
              </div>    
            </div>
            <div className="container__box">
              <div className="box__title">
                <h3>Medallas</h3>
              </div>
              <div className="box__content">
                <div className="content__list">
                  <div className="list__award">
                    {getTeamAchievements().length > 0 ? (
                      getTeamAchievements().map((achievement, index) => (
                        <div key={index} className="award">
                          <div className="award__border"></div>
                          <div className="award__body">
                            <i className="fa-solid fa-star"></i>
                          </div>
                          <div className="award__ribbon ribbon--left"></div>
                          <div className="award__ribbon ribbon--right"></div>
                        </div>
                      ))
                    ) : (
                      <p>No hay medallas obtenidas</p>
                    )}
                  </div>                                                         
                </div>
              </div>
            </div>                
          </div>
          <div className="container__center">                        
            <div className="container__box">
              <div className="box__title">
                <h3>Progreso de la Partida</h3>
              </div>
              <div className="box__results">
                <div className="results__header">
                  <div className="results__title">
                    <h4>Grupo: {selectedTeam}</h4>
                  </div>
                  <div className="results__title">
                    <h4>Fecha: {new Date(results.partida.FechaInicio).toLocaleDateString()}</h4>
                  </div>
                </div>
                <div className="results__content">
                  {getTeamResults().map((game, index) => (
                    <div 
                      key={index} 
                      className={`results__shape ${game.progreso === "N/A" ? 'not-participated' : ''}`}
                    >
                      <div className="shape__icon">
                        <i className="fa-solid fa-bolt"></i>
                      </div>
                      <div className="shape__data">
                        <div className="data__text">
                          <h4 className="data__title">Juego #{game.juegoNumero}</h4>
                          <p className="data__text">{game.tipoJuego}</p>
                          {game.progreso === "N/A" && (
                            <p className="data__text not-participated-text">No participado</p>
                          )}
                        </div>
                        <div className="data__text">
                          <h4 className="data__title">Tiempo:</h4>
                          <p className="data__text">{formatTime(game.tiempo)}</p>
                        </div>
                        <div className="data__text">
                          <h4 className="data__title">Tema:</h4>
                          <p className="data__text">{game.tema || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="container__right">
            <div className="right__groups">
              <div className="box__title">
                <h3>Grupos</h3>
              </div>
              <div className="right__box">
                <div className="box__list">
                  {results.equipo ? (
                    // Estudiante - solo muestra su equipo
                    <div 
                      className={`list__group ${selectedTeam === results.equipo.numero ? 'selected' : ''}`}
                      onClick={() => setSelectedTeam(results.equipo.numero)}
                    >
                      <div className="group__text">
                        <h4>Grupo {results.equipo.numero}</h4>
                      </div>
                      <div className="group__text">
                        <h4>{calculateTotalTime(results.equipo.resultados)}</h4>
                      </div>                                    
                    </div>
                  ) : results.equipos?.map((team, index) => (
                    // Profesor - muestra todos los equipos
                    <div 
                      key={index} 
                      className={`list__group ${selectedTeam === team.equipo ? 'selected' : ''}`}
                      onClick={() => setSelectedTeam(team.equipo)}
                    >
                      <div className="group__text">
                        <h4>Grupo {team.equipo}</h4>
                      </div>
                      <div className="group__text">
                        <h4>{calculateTotalTime(team.resultados)}</h4>
                      </div>                                    
                    </div>
                  ))}
                </div>
              </div>
              <div className="right__buttons">
                <button className="right__button">Salir</button>
                <button className="right__button">Descargar PDF</button>
              </div>
            </div>
            <div className="right__images">
              <div className="right__slider">
                <div className="slider__images" style={{ left: -active * 20 + 'vmax' }}>
                  {images.map((src, index) => (
                    src.startsWith('data:image') ? (
                      <img key={index} className="image__item" src={src} alt={`Dibujo ${index + 1}`} />
                    ) : (
                      <img key={index} className="image__item" src={src} alt={`Slide ${index + 1}`} />
                    )
                  ))}
                </div>
                <div className="slider__nav">
                  <button className="nav__button" onClick={handlePrevClick}>
                    <i className="fa-solid fa-caret-left"></i>
                  </button>
                  <button className="nav__button" onClick={handleNextClick}>
                    <i className="fa-solid fa-caret-right"></i>
                  </button>
                </div>                            
                <button className="button__download" onClick={() => {
                  const link = document.createElement('a');
                  if (images[active].startsWith('data:image')) {
                    link.href = images[active];
                    link.download = `dibujo-${active+1}.png`;
                  } else {
                    link.href = images[active];
                    link.download = `imagen-${active+1}.jpg`;
                  }
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}>
                  <i className="fa-solid fa-download"></i>
                </button>
              </div>
            </div>                    
          </div>            
        </div>
      </main>
    </div>
  );
}

export default ResultsTeacher;