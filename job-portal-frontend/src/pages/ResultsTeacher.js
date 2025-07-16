import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Cookies from "js-cookie";
import "../styles/resultsTeacher.css";

const apiUrl = process.env.REACT_APP_API_URL;

function ResultsTeacher() {
  const { partidaId } = useParams();
  const [equipos, setEquipos] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [logros, setLogros] = useState({});
  const [partida, setPartida] = useState(null);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [imagenesDibujo, setImagenesDibujo] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleNextClick = useCallback(() => {
    setActive((prev) => (prev + 1 < imagenesDibujo.length ? prev + 1 : 0));
  }, [imagenesDibujo.length]);

  const handlePrevClick = () => {
    setActive((prev) => (prev - 1 >= 0 ? prev - 1 : imagenesDibujo.length - 1));
  };

  useEffect(() => {
    const interval = setInterval(handleNextClick, 5000);
    return () => clearInterval(interval);
  }, [handleNextClick]);

  useEffect(() => {
    const fetchResults = async () => {
      const token = Cookies.get("authToken");
      try {
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

        setEquipos(data.equipos || []);
        setResultados(data.resultados || []);
        setLogros(data.logros || {});
        setPartida(data.partida || null);
        setGrupoSeleccionado(data.equipos?.[0]?.equipo || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [partidaId]);

  useEffect(() => {
    if (!grupoSeleccionado) return;
    const resultadoGrupo = resultados.find((r) => r.equipo === grupoSeleccionado);
    if (!resultadoGrupo || !resultadoGrupo.resultados) {
      setImagenesDibujo([]);
      return;
    }

    const imagenes = resultadoGrupo.resultados
      .map((r) => {
        try {
          const parsed = JSON.parse(r.Resultados);
          return parsed
            .filter((j) => j.tipoJuego === "Dibujo" && j.comentario?.startsWith("data:image"))
            .map((j) => j.comentario);
        } catch {
          return [];
        }
      })
      .flat();

    setImagenesDibujo(imagenes);
    setActive(0); // reset slider al cambiar grupo
  }, [grupoSeleccionado, resultados]);

  const obtenerMiembros = (grupo) => {
    const equipo = equipos.find((e) => e.equipo === grupo);
    return equipo?.miembros || [];
  };

  const obtenerResultadosGrupo = (grupo) => {
    const grupoResult = resultados.find((r) => r.equipo === grupo);
    if (!grupoResult?.resultados?.[0]) return [];

    try {
      return JSON.parse(grupoResult.resultados[0].Resultados);
    } catch {
      return [];
    }
  };

  const handleGrupoClick = (grupo) => {
    setGrupoSeleccionado(grupo);
  };

  const formatearTiempo = (segundos) => {
    const min = Math.floor(segundos / 60).toString().padStart(2, "0");
    const sec = (segundos % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  if (loading) return <div>Cargando resultados...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!equipos.length) return <div>No se encontraron resultados</div>;

  const miembros = obtenerMiembros(grupoSeleccionado);
  const juegos = obtenerResultadosGrupo(grupoSeleccionado);

  return (
    <div className="results__body">
      {/* Header, etc... */}
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
          {/* Lado izquierdo */}
          <div className="container__left">
            {/* Miembros */}
            <div className="container__box">
              <div className="box__title">
                <h3>Miembros</h3>
              </div>
              <div className="box__group">
                {miembros.map((m, i) => (
                  <div key={i} className="group__shape">
                    <h4 className="shape__name">
                      {m.Nombre} {m.Apellido1} {m.Apellido2}
                    </h4>
                  </div>
                ))}
              </div>
            </div>

            {/* Medallas */}
            <div className="container__box">
              <div className="box__title">
                <h3>Medallas</h3>
              </div>
              <div className="box__content">
                <div className="content__list">
                  <div className="list__award">
                    {logros?.[grupoSeleccionado]?.length > 0 ? (
                      logros[grupoSeleccionado].map((_, i) => (
                        <div className="award" key={i}>
                          <div className="award__border"></div>
                          <div className="award__body">
                            <i className="fa-solid fa-star"></i>
                          </div>
                          <div className="award__ribbon ribbon--left"></div>
                          <div className="award__ribbon ribbon--right"></div>
                        </div>
                      ))
                    ) : (
                      <p>No hay medallas disponibles</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Centro: juegos */}
          <div className="container__center">
            <div className="container__box">
              <div className="box__title">
                <h3>Progreso de la Partida</h3>
              </div>
              <div className="box__results">
                <div className="results__header">
                  <h4>Grupo: {grupoSeleccionado}</h4>
                  <h4>
                    Fecha:{" "}
                    {partida?.FechaFin
                      ? new Date(partida.FechaFin).toLocaleDateString()
                      : "Sin fecha"}
                  </h4>
                </div>
                <div className="results__content">
                  {juegos.map((juego, index) => (
                    <div key={index} className="results__shape">
                      <div className="shape__icon">
                        <i className="fa-solid fa-bolt"></i>
                      </div>
                      <div className="shape__data">
                        <div className="data__text">
                          <h4 className="data__title">Juego #{juego.juegoNumero}</h4>
                          <p className="data__text">{juego.tipoJuego}</p>
                        </div>
                        <div className="data__text">
                          <h4 className="data__title">Tiempo:</h4>
                          <p className="data__text">{formatearTiempo(juego.tiempo || 0)}</p>
                        </div>
                        <div className="data__text">
                          <h4 className="data__title">Dificultad:</h4>
                          <p className="data__text">{juego.dificultad || "No definida"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Lado derecho */}
          <div className="container__right">
            <div className="right__groups">
              <div className="box__title">
                <h3>Grupos</h3>
              </div>
              <div className="right__box">
                <div className="box__list">
                  {equipos.map((e) => {
                    const tiempoGrupo = obtenerResultadosGrupo(e.equipo).reduce(
                      (acc, j) => acc + (j.tiempo || 0),
                      0
                    );
                    return (
                      <div
                        key={e.equipo}
                        className={`list__group ${
                          e.equipo === grupoSeleccionado ? "grupo-activo" : ""
                        }`}
                        onClick={() => handleGrupoClick(e.equipo)}
                      >
                        <h4>Grupo {e.equipo}</h4>
                        <h4>{formatearTiempo(tiempoGrupo)}</h4>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="right__buttons">
                <button className="right__button">Salir</button>
                <button className="right__button">Descargar PDF</button>
              </div>
            </div>

            {/* Slider de imágenes base64 */}
            <div className="right__images" style={{ textAlign: "center", marginTop: "1rem" }}>
              {imagenesDibujo.length > 0 ? (
                <>
                  <img
                    src={imagenesDibujo[active]}
                    alt={`Dibujo ${active + 1}`}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "300px",
                      borderRadius: "8px",
                      boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                      objectFit: "contain",
                    }}
                  />
                  <div style={{ marginTop: "0.5rem" }}>
                    <button onClick={handlePrevClick} style={{ marginRight: "10px" }}>
                      ← Anterior
                    </button>
                    <button onClick={handleNextClick}>Siguiente →</button>
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = imagenesDibujo[active];
                        link.download = `imagen-${active + 1}.png`;
                        link.click();
                      }}
                    >
                      Descargar imagen
                    </button>
                  </div>
                  <p style={{ marginTop: "0.5rem" }}>
                    Imagen {active + 1} de {imagenesDibujo.length}
                  </p>
                </>
              ) : (
                <p className="sin-imagenes-texto">Sin dibujos disponibles</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ResultsTeacher;
