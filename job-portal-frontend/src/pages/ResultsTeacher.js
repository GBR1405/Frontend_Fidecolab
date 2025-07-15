import React, { useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import "../styles/resultsTeacher.css";
import { useNavigate, Link } from 'react-router-dom';

function ResultsTeacher() {

  const [active, setActive] = React.useState(0);
  const [refreshInterval, setRefreshInterval] = React.useState(null);
  const { partidaId } = useParams();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

  const images = [
    'Fidelitas1.jpg',
    'Fidelitas2.png',
    'Fidelitas3.jpg',
    'Ejemplo2.jpg',
    'Ejemplo1.jpg'
  ];

  useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await fetch(`/api/resultados/${partidaId}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Error al obtener resultados');
                }

                const data = await response.json();
                setResults(data);
                console.log('Datos recibidos:', data);
                
                // Aquí puedes procesar los datos para adaptarlos a tu UI
                // Por ejemplo, mapear miembros, resultados, etc.

            } catch (err) {
                setError(err.message);
                console.error('Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [partidaId]);

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

  if (loading) return <div>Cargando resultados...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!results) return <div>No se encontraron resultados</div>;

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
                            <div className="group__shape">
                                <h4 className="shape__name">Climado Aguado Sainz</h4>
                            </div>
                            <div className="group__shape">
                                <h4 className="shape__name">Fatima Villalanga Chaves</h4>
                            </div>
                            <div className="group__shape">
                                <h4 className="shape__name">Andres Solanos Carranza</h4>
                            </div>
                            <div className="group__shape">
                                <h4 className="shape__name">Felipe Eduardo Simpson</h4>
                            </div>
                        </div>    
                    </div>
                    <div className="container__box">
                        <div className="box__title">
                            <h3>Medallas</h3>
                        </div>
                        <div className="box__content">
                            <div className="content__list">
                                <div className="list__award">
                                    <div class="award">
                                        <div class="award__border"></div>
                                        <div class="award__body">
                                            <i class="fa-solid fa-star"></i>
                                        </div>
                                        <div class="award__ribbon ribbon--left"></div>
                                        <div class="award__ribbon ribbon--right"></div>
                                    </div>
                                    <div class="award">
                                        <div class="award__border"></div>
                                        <div class="award__body">
                                            <i class="fa-solid fa-star"></i>
                                        </div>
                                        <div class="award__ribbon ribbon--left"></div>
                                        <div class="award__ribbon ribbon--right"></div>
                                    </div>
                                    <div class="award">
                                        <div class="award__border"></div>
                                        <div class="award__body">
                                            <i class="fa-solid fa-star"></i>
                                        </div>
                                        <div class="award__ribbon ribbon--left"></div>
                                        <div class="award__ribbon ribbon--right"></div>
                                    </div>
                                    <div class="award">
                                        <div class="award__border"></div>
                                        <div class="award__body">
                                            <i class="fa-solid fa-star"></i>
                                        </div>
                                        <div class="award__ribbon ribbon--left"></div>
                                        <div class="award__ribbon ribbon--right"></div>
                                    </div>
                                    <div class="award">
                                        <div class="award__border"></div>
                                        <div class="award__body">
                                            <i class="fa-solid fa-star"></i>
                                        </div>
                                        <div class="award__ribbon ribbon--left"></div>
                                        <div class="award__ribbon ribbon--right"></div>
                                    </div>
                                    <div class="award">
                                        <div class="award__border"></div>
                                        <div class="award__body">
                                            <i class="fa-solid fa-star"></i>
                                        </div>
                                        <div class="award__ribbon ribbon--left"></div>
                                        <div class="award__ribbon ribbon--right"></div>
                                    </div>
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
                                    <h4>Grupo: 4</h4>
                                </div>
                                <div className="results__title">
                                    <h4>Fecha: 28/07/2025</h4>
                                </div>
                            </div>
                            <div className="results__content">
                                <div className="results__shape">
                                    <div className="shape__icon">
                                        <i class="fa-solid fa-bolt"></i>
                                    </div>
                                    <div className="shape__data">
                                        <div className="data__text">
                                                <h4 className="data__title">Juego #1</h4>
                                                <p className="data__text">Rompecabezas</p>
                                        </div>
                                        <div className="data__text">
                                            <h4 className="data__title">Tiempo:</h4>
                                            <p className="data__text">03:24</p>
                                        </div>
                                        <div className="data__text">
                                            <h4 className="data__title">Dificultad:</h4>
                                            <p className="data__text">Facil</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="results__shape">
                                    <div className="shape__icon">
                                        <i class="fa-solid fa-bolt"></i>
                                    </div>
                                    <div className="shape__data">
                                        <div className="data__text">
                                                <h4 className="data__title">Juego #1</h4>
                                                <p className="data__text">Rompecabezas</p>
                                        </div>
                                        <div className="data__text">
                                            <h4 className="data__title">Tiempo:</h4>
                                            <p className="data__text">03:24</p>
                                        </div>
                                        <div className="data__text">
                                            <h4 className="data__title">Dificultad:</h4>
                                            <p className="data__text">Facil</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="results__shape">
                                    <div className="shape__icon">
                                        <i class="fa-solid fa-bolt"></i>
                                    </div>
                                    <div className="shape__data">
                                        <div className="data__text">
                                                <h4 className="data__title">Juego #1</h4>
                                                <p className="data__text">Rompecabezas</p>
                                        </div>
                                        <div className="data__text">
                                            <h4 className="data__title">Tiempo:</h4>
                                            <p className="data__text">03:24</p>
                                        </div>
                                        <div className="data__text">
                                            <h4 className="data__title">Dificultad:</h4>
                                            <p className="data__text">Facil</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="results__shape">
                                    <div className="shape__icon">
                                        <i class="fa-solid fa-bolt"></i>
                                    </div>
                                    <div className="shape__data">
                                        <div className="data__text">
                                                <h4 className="data__title">Juego #1</h4>
                                                <p className="data__text">Rompecabezas</p>
                                        </div>
                                        <div className="data__text">
                                            <h4 className="data__title">Tiempo:</h4>
                                            <p className="data__text">03:24</p>
                                        </div>
                                        <div className="data__text">
                                            <h4 className="data__title">Dificultad:</h4>
                                            <p className="data__text">Facil</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="results__shape">
                                    <div className="shape__icon">
                                        <i class="fa-solid fa-bolt"></i>
                                    </div>
                                    <div className="shape__data">
                                        <div className="data__text">
                                                <h4 className="data__title">Juego #1</h4>
                                                <p className="data__text">Rompecabezas</p>
                                        </div>
                                        <div className="data__text">
                                            <h4 className="data__title">Tiempo:</h4>
                                            <p className="data__text">03:24</p>
                                        </div>
                                        <div className="data__text">
                                            <h4 className="data__title">Dificultad:</h4>
                                            <p className="data__text">Facil</p>
                                        </div>
                                    </div>
                                </div>
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
                                <div className="list__group">
                                    <div className="group__text">
                                        <h4>Grupo 1</h4>
                                    </div>
                                    <div className="group__text">
                                        <h4>05:00</h4>
                                    </div>                                    
                                </div>
                                <div className="list__group">
                                    <div className="group__text">
                                        <h4>Grupo 1</h4>
                                    </div>
                                    <div className="group__text">
                                        <h4>05:00</h4>
                                    </div>                                    
                                </div>
                                <div className="list__group">
                                    <div className="group__text">
                                        <h4>Grupo 1</h4>
                                    </div>
                                    <div className="group__text">
                                        <h4>05:00</h4>
                                    </div>                                    
                                </div>
                                <div className="list__group">
                                    <div className="group__text">
                                        <h4>Grupo 1</h4>
                                    </div>
                                    <div className="group__text">
                                        <h4>05:00</h4>
                                    </div>                                    
                                </div>
                                <div className="list__group">
                                    <div className="group__text">
                                        <h4>Grupo 1</h4>
                                    </div>
                                    <div className="group__text">
                                        <h4>05:00</h4>
                                    </div>                                    
                                </div>
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
                                    <img key={index} className="image__item" src={src} alt={`Slide ${index + 1}`} />
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
                                link.href = images[active];
                                link.download = `imagen-${active+1}.jpg`;
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
