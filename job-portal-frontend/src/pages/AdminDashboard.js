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

    const startMetricAnimation = (metricKey) => {
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

const stopMetricAnimation = (metricKey, finalValue) => {
    const finalString = finalValue.toString().padStart(4, '0');
    let fixedDigits = 0;

    // Detener la animación previa de esa métrica si existe
    if (animationIntervals[metricKey]) {
        clearInterval(animationIntervals[metricKey]);
        setAnimationIntervals(prev => {
            const copy = { ...prev };
            delete copy[metricKey];
            return copy;
        });
    }

    const digitFixInterval = setInterval(() => {
        setDisplayValues(prev => {
            const current = prev[metricKey]?.split('') || ['0', '0', '0', '0'];
            for (let i = 0; i < 4; i++) {
                if (i < fixedDigits) {
                    current[i] = finalString[i]; // Fijar dígitos ya definidos
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

        // Si ya fijamos los 4 dígitos, detenemos
        if (fixedDigits > 4) {
            clearInterval(digitFixInterval);
            setDisplayValues(prev => ({
                ...prev,
                [metricKey]: finalString
            }));
        }
    }, 500);
};

    // Función para generar un número aleatorio de 4 dígitos como string
    const generateRandomNumberString = () => {
        return Math.floor(1000 + Math.random() * 9000).toString();
    };

    // Función para animar el cambio de número
    // Función para animar el cambio de número
const animateNumberChange = (targetValue, metricKey) => {
    const targetString = targetValue.toString().padStart(4, '0');
    const animationDuration = 2000; // Duración total de la animación en ms
    const digitDuration = animationDuration / targetString.length;
    
    // Primero, establecer todos los dígitos en animación aleatoria
    const initialRandom = Array(4).fill(0).map(() => Math.floor(Math.random() * 10).toString()).join('');
    setDisplayValues(prev => ({
        ...prev,
        [metricKey]: initialRandom
    }));
    
    // Animación para cada dígito
    targetString.split('').forEach((targetDigit, index) => {
        // Intervalo para animar este dígito específico
        const digitInterval = setInterval(() => {
            setDisplayValues(prev => {
                const newDisplay = prev[metricKey].split('');
                newDisplay[index] = Math.floor(Math.random() * 10).toString();
                return {
                    ...prev,
                    [metricKey]: newDisplay.join('')
                };
            });
        }, 100); // Cambia este valor para ajustar la velocidad de la animación
        
        // Detener la animación de este dígito después de su tiempo asignado
        setTimeout(() => {
            clearInterval(digitInterval);
            setDisplayValues(prev => {
                const newDisplay = prev[metricKey].split('');
                newDisplay[index] = targetDigit;
                return {
                    ...prev,
                    [metricKey]: newDisplay.join('')
                };
            });
        }, (index + 1) * digitDuration);
    });
};

    // Función para obtener las métricas del backend
    const fetchMetrics = async () => {
    try {
        setIsLoading(true);

        // Iniciar animaciones para cada métrica
        startMetricAnimation('partidasJugadas');
        startMetricAnimation('totalEstudiantes');
        startMetricAnimation('totalProfesores');
        startMetricAnimation('totalPersonalizaciones');

        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/metricas`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) throw new Error('Error al obtener las métricas');

        const data = await response.json();
        setMetrics(data);

        // Detener animación y fijar cada métrica con animación progresiva
        setTimeout(() => stopMetricAnimation('partidasJugadas', data.partidasJugadas), 0);
        setTimeout(() => stopMetricAnimation('totalEstudiantes', data.totalEstudiantes), 300);
        setTimeout(() => stopMetricAnimation('totalProfesores', data.totalProfesores), 600);
        setTimeout(() => stopMetricAnimation('totalPersonalizaciones', data.totalPersonalizaciones), 900);

    } catch (error) {
        console.error("Error fetching metrics:", error);
    } finally {
        setIsLoading(false);
    }
};

    useEffect(() => {
        fetchMetrics();

        // Configurar intervalo para actualizar las métricas cada 5 minutos
        const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Slider logic (tu código existente)
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
                    
                    {/* Resto de tu código existente */}
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