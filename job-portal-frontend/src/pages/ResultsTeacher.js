import React from "react";
import "../styles/resultsTeacher.css";
import { useParams, useNavigate, Link  } from 'react-router-dom';

function ResultsTeacher() {
  const [active_r, setActive_r] = React.useState(0);
  const [refreshInterval_r, setRefreshInterval_r] = React.useState(null);

  const images_r = [
    'Fidelitas1.jpg',
    'Fidelitas2.png',
    'Fidelitas3.jpg',
    'Ejemplo2.jpg',
    'Ejemplo1.jpg'
  ];

  const handleNextClick_r = React.useCallback(() => {
    setActive_r((prev) => (prev + 1 <= images_r.length - 1 ? prev + 1 : 0));
  }, [images_r.length]);

  const handlePrevClick_r = () => {
    setActive_r((prev) => (prev - 1 >= 0 ? prev - 1 : images_r.length - 1));
  };

  React.useEffect(() => {
    const interval_r = setInterval(handleNextClick_r, 5000);
    setRefreshInterval_r(interval_r);

    return () => clearInterval(interval_r);
  }, [active_r, handleNextClick_r]);

  return (
    <div className="results__body_r">    
        <header className="header_r">
            <Link to="/" className="logo__link_r">
                <img 
                  className="image__source_r" 
                  src="https://i.postimg.cc/NGzXwBp6/logo.png" 
                  alt="Logo institución" 
                />
                <div>
                  <h2 className="logo__text_r">FideColab</h2>
                </div>
            </Link>
                <div className="header__title_r">
                  <h1 className="title__text_r">Resultados</h1>
                </div>
        </header>     
        <main className="main_r">
            <div className="results__container_r">
                <div className="container__left_r">   
                    <div className="container__box_r">
                        <div className="box__title_r">
                            <h3>Miembros</h3>
                        </div>
                        <div className="box__group_r">
                            <div className="group__shape_r">
                                <h4 className="shape__name_r">Climado Aguado Sainz</h4>
                            </div>
                            <div className="group__shape_r">
                                <h4 className="shape__name_r">Fatima Villalanga Chaves</h4>
                            </div>
                            <div className="group__shape_r">
                                <h4 className="shape__name_r">Andres Solanos Carranza</h4>
                            </div>
                            <div className="group__shape_r">
                                <h4 className="shape__name_r">Felipe Eduardo Simpson</h4>
                            </div>
                        </div>    
                    </div>
                    <div className="container__box_r">
                        <div className="box__title_r">
                            <h3>Medallas</h3>
                        </div>
                        <div className="box__content_r">
                            <div className="content__list_r">
                                <div className="list__award_r">
                                    <div className="award_r">
                                        <div className="award__border_r"></div>
                                        <div className="award__body_r">
                                            <i className="fa-solid fa-star"></i>
                                        </div>
                                        <div className="award__ribbon_r ribbon--left_r"></div>
                                        <div className="award__ribbon_r ribbon--right_r"></div>
                                    </div>
                                    <div className="award_r">
                                        <div className="award__border_r"></div>
                                        <div className="award__body_r">
                                            <i className="fa-solid fa-star"></i>
                                        </div>
                                        <div className="award__ribbon_r ribbon--left_r"></div>
                                        <div className="award__ribbon_r ribbon--right_r"></div>
                                    </div>
                                    <div className="award_r">
                                        <div className="award__border_r"></div>
                                        <div className="award__body_r">
                                            <i className="fa-solid fa-star"></i>
                                        </div>
                                        <div className="award__ribbon_r ribbon--left_r"></div>
                                        <div className="award__ribbon_r ribbon--right_r"></div>
                                    </div>
                                    <div className="award_r">
                                        <div className="award__border_r"></div>
                                        <div className="award__body_r">
                                            <i className="fa-solid fa-star"></i>
                                        </div>
                                        <div className="award__ribbon_r ribbon--left_r"></div>
                                        <div className="award__ribbon_r ribbon--right_r"></div>
                                    </div>
                                    <div className="award_r">
                                        <div className="award__border_r"></div>
                                        <div className="award__body_r">
                                            <i className="fa-solid fa-star"></i>
                                        </div>
                                        <div className="award__ribbon_r ribbon--left_r"></div>
                                        <div className="award__ribbon_r ribbon--right_r"></div>
                                    </div>
                                    <div className="award_r">
                                        <div className="award__border_r"></div>
                                        <div className="award__body_r">
                                            <i className="fa-solid fa-star"></i>
                                        </div>
                                        <div className="award__ribbon_r ribbon--left_r"></div>
                                        <div className="award__ribbon_r ribbon--right_r"></div>
                                    </div>
                                </div>                                                         
                            </div>
                        </div>
                    </div>                
                </div>
                <div className="container__center_r">                        
                    <div className="container__box_r">
                        <div className="box__title_r">
                            <h3>Progreso de la Partida</h3>
                        </div>
                        <div className="box__results_r">
                            <div className="results__header_r">
                                <div className="results__title_r">
                                    <h4>Grupo: 4</h4>
                                </div>
                                <div className="results__title_r">
                                    <h4>Fecha: 28/07/2025</h4>
                                </div>
                            </div>
                            <div className="results__content_r">
                                <div className="results__shape_r">
                                    <div className="shape__icon_r">
                                        <i className="fa-solid fa-bolt"></i>
                                    </div>
                                    <div className="shape__data_r">
                                        <div className="data__text_r">
                                                <h4 className="data__title_r">Juego #1</h4>
                                                <p className="data__text_r">Rompecabezas</p>
                                        </div>
                                        <div className="data__text_r">
                                            <h4 className="data__title_r">Tiempo:</h4>
                                            <p className="data__text_r">03:24</p>
                                        </div>
                                        <div className="data__text_r">
                                            <h4 className="data__title_r">Dificultad:</h4>
                                            <p className="data__text_r">Facil</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="results__shape_r">
                                    <div className="shape__icon_r">
                                        <i className="fa-solid fa-bolt"></i>
                                    </div>
                                    <div className="shape__data_r">
                                        <div className="data__text_r">
                                                <h4 className="data__title_r">Juego #1</h4>
                                                <p className="data__text_r">Rompecabezas</p>
                                        </div>
                                        <div className="data__text_r">
                                            <h4 className="data__title_r">Tiempo:</h4>
                                            <p className="data__text_r">03:24</p>
                                        </div>
                                        <div className="data__text_r">
                                            <h4 className="data__title_r">Dificultad:</h4>
                                            <p className="data__text_r">Facil</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="results__shape_r">
                                    <div className="shape__icon_r">
                                        <i className="fa-solid fa-bolt"></i>
                                    </div>
                                    <div className="shape__data_r">
                                        <div className="data__text_r">
                                                <h4 className="data__title_r">Juego #1</h4>
                                                <p className="data__text_r">Rompecabezas</p>
                                        </div>
                                        <div className="data__text_r">
                                            <h4 className="data__title_r">Tiempo:</h4>
                                            <p className="data__text_r">03:24</p>
                                        </div>
                                        <div className="data__text_r">
                                            <h4 className="data__title_r">Dificultad:</h4>
                                            <p className="data__text_r">Facil</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="results__shape_r">
                                    <div className="shape__icon_r">
                                        <i className="fa-solid fa-bolt"></i>
                                    </div>
                                    <div className="shape__data_r">
                                        <div className="data__text_r">
                                                <h4 className="data__title_r">Juego #1</h4>
                                                <p className="data__text_r">Rompecabezas</p>
                                        </div>
                                        <div className="data__text_r">
                                            <h4 className="data__title_r">Tiempo:</h4>
                                            <p className="data__text_r">03:24</p>
                                        </div>
                                        <div className="data__text_r">
                                            <h4 className="data__title_r">Dificultad:</h4>
                                            <p className="data__text_r">Facil</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="results__shape_r">
                                    <div className="shape__icon_r">
                                        <i className="fa-solid fa-bolt"></i>
                                    </div>
                                    <div className="shape__data_r">
                                        <div className="data__text_r">
                                                <h4 className="data__title_r">Juego #1</h4>
                                                <p className="data__text_r">Rompecabezas</p>
                                        </div>
                                        <div className="data__text_r">
                                            <h4 className="data__title_r">Tiempo:</h4>
                                            <p className="data__text_r">03:24</p>
                                        </div>
                                        <div className="data__text_r">
                                            <h4 className="data__title_r">Dificultad:</h4>
                                            <p className="data__text_r">Facil</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="container__right_r">
                    <div className="right__groups_r">
                        <div className="box__title_r">
                            <h3>Grupos</h3>
                        </div>
                        <div className="right__box_r">
                            <div className="box__list_r">
                                <div className="list__group_r">
                                    <div className="group__text_r">
                                        <h4>Grupo 1</h4>
                                    </div>
                                    <div className="group__text_r">
                                        <h4>05:00</h4>
                                    </div>                                    
                                </div>
                                <div className="list__group_r">
                                    <div className="group__text_r">
                                        <h4>Grupo 1</h4>
                                    </div>
                                    <div className="group__text_r">
                                        <h4>05:00</h4>
                                    </div>                                    
                                </div>
                                <div className="list__group_r">
                                    <div className="group__text_r">
                                        <h4>Grupo 1</h4>
                                    </div>
                                    <div className="group__text_r">
                                        <h4>05:00</h4>
                                    </div>                                    
                                </div>
                                <div className="list__group_r">
                                    <div className="group__text_r">
                                        <h4>Grupo 1</h4>
                                    </div>
                                    <div className="group__text_r">
                                        <h4>05:00</h4>
                                    </div>                                    
                                </div>
                                <div className="list__group_r">
                                    <div className="group__text_r">
                                        <h4>Grupo 1</h4>
                                    </div>
                                    <div className="group__text_r">
                                        <h4>05:00</h4>
                                    </div>                                    
                                </div>
                            </div>
                        </div>
                        <div className="right__buttons_r">
                            <button className="right__button_r">Salir</button>
                            <button className="right__button_r">Descargar PDF</button>
                        </div>
                    </div>
                    <div className="right__images_r">
                        <div className="right__slider_r">
                            <div className="slider__images_r" style={{ left: -active_r * 20 + 'vmax' }}>
                                {images_r.map((src, index) => (
                                    <img key={index} className="image__item_r" src={src} alt={`Slide ${index + 1}`} />
                                ))}
                            </div>
                            <div className="slider__nav_r">
                                <button className="nav__button_r" onClick={handlePrevClick_r}>
                                    <i className="fa-solid fa-caret-left"></i>
                                </button>
                                <button className="nav__button_r" onClick={handleNextClick_r}>
                                    <i className="fa-solid fa-caret-right"></i>
                                </button>
                            </div>                            
                            <button className="button__download_r" onClick={() => {
                                const link = document.createElement('a');
                                link.href = images_r[active_r];
                                link.download = `imagen-${active_r+1}.jpg`;
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