import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Cookies from "js-cookie";
import "../styles/resultsTeacher.css";

const apiUrl = process.env.REACT_APP_API_URL;

function ResultsTeacher() {
  const { partidaId } = useParams();
  const [results, setResults] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [imagenesDibujo, setImagenesDibujo] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleNextClick = useCallback(() => {
    setActive((prev) => (prev + 1) % imagenesDibujo.length);
  }, [imagenesDibujo]);

  const handlePrevClick = () => {
    setActive((prev) => (prev - 1 + imagenesDibujo.length) % imagenesDibujo.length);
  };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = Cookies.get("authToken");
        const response = await fetch(`${apiUrl}/resultados/${partidaId}`, {
          method: "GET",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Error al obtener resultados");

        const data = await response.json();
        console.log('Datos recibidos:', data);
        setResults(Array.isArray(data) ? data : []);
        setGrupoSeleccionado((Array.isArray(data) && data[0]) ? data[0].grupo : null);
      } catch (err) {
        setError(err.message);
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [partidaId]);

  useEffect(() => {
    if (!results || !grupoSeleccionado) return;

    const grupo = results.find((g) => g.grupo === grupoSeleccionado);
    if (!grupo || !grupo.juegos) return;

    const imagenes = grupo.juegos
      .filter(j => j.tipoJuego === "Dibujo" && j.comentario?.startsWith("data:image"))
      .map(j => j.comentario);

    setImagenesDibujo(imagenes.length > 0 ? imagenes : ["https://via.placeholder.com/400x300"]);
    setActive(0);
  }, [grupoSeleccionado, results]);

  const formatTiempo = (segundos) => {
    const min = Math.floor(segundos / 60).toString().padStart(2, "0");
    const sec = (segundos % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  const handleGrupoClick = (grupo) => {
    setGrupoSeleccionado(grupo);
    setActive(0);
  };

  if (loading) return <div className="loading">Cargando resultados...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!results || results.length === 0) return <div>No se encontraron resultados</div>;


   return (
    <div className="results__body">
      <header className="header">
        <Link to="/" className="logo__link">
          <img className="image__source" src="https://i.postimg.cc/NGzXwBp6/logo.png" alt="Logo institución" />
          <div><h2 className="logo__text">FideColab</h2></div>
        </Link>
        <div className="header__title"><h1 className="title__text">Resultados</h1></div>
      </header>

      <main className="main">
        <div className="results__container">
          {/* LADO IZQUIERDO */}
          <div className="container__left">
            <div className="container__box">
              <div className="box__title"><h3>Miembros</h3></div>
              <div className="box__group">
                {results.find(g => g.grupo === grupoSeleccionado)?.miembros?.map((miembro, i) => (
                  <div key={i} className="group__shape">
                    <h4 className="shape__name">{miembro}</h4>
                  </div>
                )) || <p>Sin miembros</p>}
              </div>
            </div>

            <div className="container__box">
              <div className="box__title"><h3>Medallas</h3></div>
              <div className="box__content">
                <div className="content__list">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="award">
                      <div className="award__border"></div>
                      <div className="award__body"><i className="fa-solid fa-star"></i></div>
                      <div className="award__ribbon ribbon--left"></div>
                      <div className="award__ribbon ribbon--right"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CENTRO */}
          <div className="container__center">
            <div className="container__box">
              <div className="box__title"><h3>Progreso de la Partida</h3></div>
              <div className="box__results">
                <div className="results__header">
                  <h4>Grupo: {grupoSeleccionado}</h4>
                  <h4>Fecha: {new Date().toLocaleDateString()}</h4>
                </div>
                <div className="results__content">
                  {results.find(g => g.grupo === grupoSeleccionado)?.juegos?.map((juego, index) => (
                    <div key={index} className="results__shape">
                      <div className="shape__icon"><i className="fa-solid fa-bolt"></i></div>
                      <div className="shape__data">
                        <div className="data__text">
                          <h4 className="data__title">Juego #{index + 1}</h4>
                          <p className="data__text">{juego.tipoJuego}</p>
                        </div>
                        <div className="data__text">
                          <h4 className="data__title">Tiempo:</h4>
                          <p className="data__text">{formatTiempo(juego.tiempo)}</p>
                        </div>
                        <div className="data__text">
                          <h4 className="data__title">Dificultad:</h4>
                          <p className="data__text">{juego.dificultad}</p>
                        </div>
                      </div>
                    </div>
                  )) || <p>No hay juegos disponibles.</p>}
                </div>
              </div>
            </div>
          </div>

          {/* LADO DERECHO */}
          <div className="container__right">
            <div className="right__groups">
              <div className="box__title"><h3>Grupos</h3></div>
              <div className="box__list">
                {results.map((equipo) => {
                  const tiempoTotal = equipo.juegos?.reduce((acc, j) => acc + (j.tiempo || 0), 0) || 0;
                  return (
                    <div
                      key={equipo.grupo}
                      className={`list__group ${equipo.grupo === grupoSeleccionado ? "grupo-activo" : ""}`}
                      onClick={() => handleGrupoClick(equipo.grupo)}
                    >
                      <h4>Grupo {equipo.grupo}</h4>
                      <h4>{formatTiempo(tiempoTotal)}</h4>
                    </div>
                  );
                })}
              </div>
              <div className="right__buttons">
                <button className="right__button">Salir</button>
                <button className="right__button">Descargar PDF</button>
              </div>
            </div>

            <div className="right__images">
              <div className="right__slider">
                <div className="slider__images" style={{ left: -active * 20 + "vmax" }}>
                  {imagenesDibujo.map((src, i) => (
                    <img key={i} className="image__item" src={src} alt={`Dibujo ${i + 1}`} />
                  ))}
                </div>
                <div className="slider__nav">
                  <button className="nav__button" onClick={handlePrevClick}><i className="fa-solid fa-caret-left"></i></button>
                  <button className="nav__button" onClick={handleNextClick}><i className="fa-solid fa-caret-right"></i></button>
                </div>
                <button className="button__download" onClick={() => {
                  const link = document.createElement("a");
                  link.href = imagenesDibujo[active];
                  link.download = `dibujo-${active + 1}.png`;
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
