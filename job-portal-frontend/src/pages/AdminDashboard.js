import React, { useState, useEffect, useCallback } from 'react';
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

    const images = [
        'https://cdn.ufidelitas.ac.cr/wp-content/uploads/2023/10/14161844/ODT-2382-BannesBlogs_Grados_100V.jpg',
        'https://cdn.ufidelitas.ac.cr/wp-content/uploads/2023/10/14161829/ODT-2382-BannesBlogs_EDC.jpg',
        'https://moria.aurens.com/content/blog_post/1100/1638249155-fide-genrica.png'
    ];

    // Función para generar un número aleatorio de 4 dígitos como string
    const generateRandomNumberString = () => {
        return Math.floor(1000 + Math.random() * 9000).toString();
    };

    // Función para animar el cambio de número
    const animateNumberChange = (targetValue, metricKey) => {
        const targetString = targetValue.toString().padStart(4, '0');
        let currentDisplay = '0000';
        
        // Animación para cada dígito
        targetString.split('').forEach((targetDigit, index) => {
            setTimeout(() => {
                const interval = setInterval(() => {
                    setDisplayValues(prev => {
                        const newDisplay = prev[metricKey].split('');
                        newDisplay[index] = Math.floor(Math.random() * 10).toString();
                        return {
                            ...prev,
                            [metricKey]: newDisplay.join('')
                        };
                    });
                }, 50);

                setTimeout(() => {
                    clearInterval(interval);
                    setDisplayValues(prev => {
                        const newDisplay = prev[metricKey].split('');
                        newDisplay[index] = targetDigit;
                        return {
                            ...prev,
                            [metricKey]: newDisplay.join('')
                        };
                    });
                }, 500 + (index * 300));
            }, index * 300);
        });
    };

    // Función para obtener las métricas del backend
    const fetchMetrics = async () => {
        try {
            setIsLoading(true);
            // Inicializar con números aleatorios
            setDisplayValues({
                partidasJugadas: generateRandomNumberString(),
                totalEstudiantes: generateRandomNumberString(),
                totalProfesores: generateRandomNumberString(),
                totalPersonalizaciones: generateRandomNumberString()
            });

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

            // Animar cada métrica
            animateNumberChange(data.partidasJugadas, 'partidasJugadas');
            animateNumberChange(data.totalEstudiantes, 'totalEstudiantes');
            animateNumberChange(data.totalProfesores, 'totalProfesores');
            animateNumberChange(data.totalPersonalizaciones, 'totalPersonalizaciones');

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
                        {/* ... resto de tu código ... */}
                    </div>
                </section>
            </LayoutAdmin>
        </>
    );
};

export default AdminDashboard;