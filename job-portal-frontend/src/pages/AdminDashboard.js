import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/adminComponents.css";
import LayoutAdmin from "../components/LayoutAdmin";

const AdminDashboard = () => {
    const [active, setActive] = useState(0);
    const [refreshInterval, setRefreshInterval] = useState(null);
    const [metrics, setMetrics] = useState({
        partidasJugadas: null,
        totalEstudiantes: null,
        totalProfesores: null,
        totalPersonalizaciones: null
    });
    const [displayValues, setDisplayValues] = useState({
        partidasJugadas: '0000',
        totalEstudiantes: '0000',
        totalProfesores: '0000',
        totalPersonalizaciones: '0000'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [animationIntervals, setAnimationIntervals] = useState({});
    const navigate = useNavigate();

    const images = [
        'https://cdn.ufidelitas.ac.cr/wp-content/uploads/2023/10/14161844/ODT-2382-BannesBlogs_Grados_100V.jpg',
        'https://cdn.ufidelitas.ac.cr/wp-content/uploads/2023/10/14161829/ODT-2382-BannesBlogs_EDC.jpg',
        'https://moria.aurens.com/content/blog_post/1100/1638249155-fide-genrica.png'
    ];

    // Función para iniciar la animación de números aleatorios
    const startRandomAnimation = (metricKey) => {
        // Limpiar intervalo existente si hay uno
        if (animationIntervals[metricKey]) {
            clearInterval(animationIntervals[metricKey]);
        }

        const interval = setInterval(() => {
            setDisplayValues(prev => {
                const randomDigits = Array(4).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
                return { ...prev, [metricKey]: randomDigits };
            });
        }, 100);

        setAnimationIntervals(prev => ({
            ...prev,
            [metricKey]: interval
        }));
    };

    // Función para detener la animación y establecer el valor final
    const stopAnimationWithEffect = (metricKey, finalValue) => {
        const finalString = finalValue.toString().padStart(4, '0');
        
        // Limpiar el intervalo de animación aleatoria
        if (animationIntervals[metricKey]) {
            clearInterval(animationIntervals[metricKey]);
            setAnimationIntervals(prev => {
                const newIntervals = { ...prev };
                delete newIntervals[metricKey];
                return newIntervals;
            });
        }

        // Animación para fijar los dígitos uno por uno
        let fixedDigits = 0;
        const digitFixInterval = setInterval(() => {
            setDisplayValues(prev => {
                const current = prev[metricKey].split('');
                for (let i = 0; i < 4; i++) {
                    if (i < fixedDigits) {
                        current[i] = finalString[i]; // Fijar dígitos ya establecidos
                    } else {
                        current[i] = Math.floor(Math.random() * 10).toString(); // Resto sigue animando
                    }
                }
                return {
                    ...prev,
                    [metricKey]: current.join('')
                };
            });

            fixedDigits++;

            // Cuando todos los dígitos están fijos, detener la animación
            if (fixedDigits > 4) {
                clearInterval(digitFixInterval);
                setDisplayValues(prev => ({
                    ...prev,
                    [metricKey]: finalString
                }));
            }
        }, 300); // Ajusta este valor para cambiar la velocidad de fijado de dígitos
    };

    // Función para obtener las métricas del backend
    const fetchMetrics = async () => {
        try {
            setIsLoading(true);
            
            // Iniciar animaciones aleatorias para todas las métricas
            startRandomAnimation('partidasJugadas');
            startRandomAnimation('totalEstudiantes');
            startRandomAnimation('totalProfesores');
            startRandomAnimation('totalPersonalizaciones');

            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/metricas`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Error al obtener las métricas');
            }

            const data = await response.json();
            setMetrics(data);

            // Detener animaciones y establecer valores reales con efecto escalonado
            setTimeout(() => stopAnimationWithEffect('partidasJugadas', data.partidasJugadas), 0);
            setTimeout(() => stopAnimationWithEffect('totalEstudiantes', data.totalEstudiantes), 200);
            setTimeout(() => stopAnimationWithEffect('totalProfesores', data.totalProfesores), 400);
            setTimeout(() => stopAnimationWithEffect('totalPersonalizaciones', data.totalPersonalizaciones), 600);

        } catch (error) {
            console.error("Error fetching metrics:", error);
            
            // En caso de error, detener todas las animaciones y mostrar ceros
            Object.keys(displayValues).forEach(key => {
                if (animationIntervals[key]) {
                    clearInterval(animationIntervals[key]);
                }
            });
            setAnimationIntervals({});
            setDisplayValues({
                partidasJugadas: '0000',
                totalEstudiantes: '0000',
                totalProfesores: '0000',
                totalPersonalizaciones: '0000'
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();

        // Configurar intervalo para actualizar las métricas cada 5 minutos
        const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
        return () => {
            clearInterval(interval);
            // Limpiar todos los intervalos de animación al desmontar
            Object.values(animationIntervals).forEach(interval => clearInterval(interval));
        };
    }, []);

    // Slider logic
    const dots = images.map((_, index) => (
        <li
            key={index}
            className={`list__dot ${index === active ? 'dot__active' : ''}`}
            onClick={() => handleDotClick(index)}
        ></li>
    ));

    const handleNextClick = useCallback(() => {
        setActive((prev) => (prev + 1 <= images.length - 1 ? prev + 1 : 0));
    }, [images.length]);

    const handlePrevClick = () => {
        setActive((prev) => (prev - 1 >= 0 ? prev - 1 : images.length - 1));
    };

    const handleDotClick = (index) => {
        setActive(index);
    };

    useEffect(() => {
        const interval = setInterval(handleNextClick, 3000);
        setRefreshInterval(interval);

        return () => clearInterval(interval);
    }, [active, handleNextClick]);

    return (
        <>
            <LayoutAdmin>
                <section className="main__container">
                    <div className="container__top">
                        <div className="top__box">
                            <div className="box__img">
                                <i className="fa-solid fa-puzzle-piece"></i>
                            </div>
                            <div className="box__text">
                                <p className="box__name">Partidas jugadas</p>
                                <p className="box__number">{displayValues.partidasJugadas}</p>
                            </div>
                        </div>
                        <div className="top__box">
                            <div className="box__img">
                                <i className="fa-solid fa-user-graduate"></i>
                            </div>
                            <div className="box__text">
                                <p className="box__name">Estudiantes</p>
                                <p className="box__number">{displayValues.totalEstudiantes}</p>
                            </div>
                        </div>
                        <div className="top__box">
                            <div className="box__img">
                                <i className="fa-solid fa-user-tie"></i>
                            </div>
                            <div className="box__text">
                                <p className="box__name">Profesores</p>
                                <p className="box__number">{displayValues.totalProfesores}</p>
                            </div>
                        </div>
                        <div className="top__box">
                            <div className="box__img">
                                <i className="fa-solid fa-pen-ruler"></i>
                            </div>
                            <div className="box__text">
                                <p className="box__name">Personalizaciones</p>
                                <p className="box__number">{displayValues.totalPersonalizaciones}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="container__left">
                        <div className="left__slider">
                            <div className="slider__images" style={{ left: -active * 80 + 'vw' }}>
                                {images.map((src, index) => (
                                    <img key={index} className="image__item" src={src} alt="" />
                                ))}
                            </div>
                            <div className="slider__nav">
                                <button className="nav__button button__prev" onClick={handlePrevClick}>
                                    <i className="fa-solid fa-caret-left"></i>
                                </button>
                                <button className="nav__button button__next" onClick={handleNextClick}>
                                    <i className="fa-solid fa-caret-right"></i>
                                </button>
                            </div>
                            <ul className="slider__list">
                                {dots}
                            </ul>
                        </div>
                    </div>
                    <div className="container__right">
                        <div className="right__title">
                            <h3>Accesos directos</h3>
                        </div>
                        <div className="right__box" onClick={() => navigate('/admin/history')} style={{ cursor: 'pointer' }}>
                            <div className="box__shape">
                                <i className="fa-solid fa-clock-rotate-left"></i>
                            </div>
                            <div className="right__text">
                                <p className="text__title">Historial</p>
                                <p className="text__description">Puedes ver el historial de las partidas.</p>
                            </div>
                        </div>
                        <div className="right__box" onClick={() => navigate('/admin/reports')} style={{ cursor: 'pointer' }}>
                            <div className="box__shape">
                                <i className="fa-solid fa-envelope-open-text"></i>
                            </div>
                            <div className="right__text">
                                <p className="text__title">Reportes</p>
                                <p className="text__description">Puedes ver reportes personalizados respecto al último cuatrimestre.</p>
                            </div>
                        </div>
                        <div className="right__box" onClick={() => navigate('/admin/depuration')} style={{ cursor: 'pointer' }}>
                            <div className="box__shape">
                                <i className="fa-solid fa-eraser"></i>
                            </div>
                            <div className="right__text">
                                <p className="text__title">Depuración</p>
                                <p className="text__description">Puedes generar una limpieza de usuarios u otros archivos.</p>
                            </div>
                        </div>
                        <div className="right__box" onClick={() => navigate('/admin/personalize_editor')} style={{ cursor: 'pointer' }}>
                            <div className="box__shape">
                                <i className="fa-solid fa-pen-to-square"></i>
                            </div>
                            <div className="right__text">
                                <p className="text__title">Personalización</p>
                                <p className="text__description">Puedes personalizar y ayudar a darle más vida a las partidas.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </LayoutAdmin>
        </>
    );
};

export default AdminDashboard;