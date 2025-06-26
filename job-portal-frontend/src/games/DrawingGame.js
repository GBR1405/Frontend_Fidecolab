import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Stage, Layer, Line, Rect, Text, Circle } from 'react-konva';
import Swal from 'sweetalert2';
import '../styles/games.css';

const DrawingGame = ({ gameConfig, onGameComplete }) => {
  const { partidaId, equipoNumero } = useParams();
  const socket = useSocket();
  const stageRef = useRef(null);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('brush');
  const [showDemo, setShowDemo] = useState(false);
  const [currentDemoTeam, setCurrentDemoTeam] = useState(1);
  const [demoDrawings, setDemoDrawings] = useState({});
  const [totalTeams, setTotalTeams] = useState(0);
  const [lastColor, setLastColor] = useState('#000000');
  
  const userId = localStorage.getItem('userId');
  const isDrawing = useRef(false);
  const lines = useRef([]);
  const remoteLines = useRef([]);
  const [tinta, setTinta] = useState(5000);
  const tintaConsumida = useRef(0);
  const MAX_TINTA = 5000;

  // Función para cambiar al dibujo anterior en la demostración
  const prevDemoDrawing = () => {
    const prevTeam = currentDemoTeam - 1;
    if (prevTeam >= 1) {
      setCurrentDemoTeam(prevTeam);
      socket.emit('changeDemoTeam', { partidaId, equipoNumero: prevTeam });
    }
  };

  // Función para cambiar al siguiente dibujo en la demostración
  const nextDemoDrawing = () => {
    const nextTeam = currentDemoTeam + 1;
    if (nextTeam <= totalTeams) {
      setCurrentDemoTeam(nextTeam);
      socket.emit('changeDemoTeam', { partidaId, equipoNumero: nextTeam });
    }
  };

  // Función para seleccionar color
  const handleColorSelect = (colorHex) => {
    setColor(colorHex);
    if (tool === 'eraser') {
      setTool('brush');
      setColor(colorHex);
    }
    setLastColor(colorHex);
  };

  // Manejar inicio de dibujo
  const handleMouseDown = (e) => {
    if (tinta <= 0) return;
    
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const newLine = {
      points: [pos.x, pos.y],
      color: tool === 'eraser' ? '#ffffff' : color,
      strokeWidth: brushSize,
      userId: userId
    };
    lines.current = [...lines.current, newLine];
  };

  // Manejar movimiento de dibujo
  const handleMouseMove = (e) => {
    if (!isDrawing.current || tinta <= 0) return;
    
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    // Calcular distancia para consumo de tinta
    const lastPoint = lines.current[lines.current.length - 1].points.slice(-2);
    const distance = Math.sqrt(
      Math.pow(point.x - lastPoint[0], 2) + Math.pow(point.y - lastPoint[1], 2)
    );
    
    if (tintaConsumida.current + distance >= MAX_TINTA) {
      Swal.fire('¡Sin tinta!', 'Debes limpiar tu dibujo para recargar.', 'warning');
      isDrawing.current = false;
      return;
    }
    
    tintaConsumida.current += distance;
    setTinta(prev => prev - distance);
    
    // Actualizar última línea
    let lastLine = lines.current[lines.current.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    
    // Enviar actualización
    socket.emit('drawingAction', {
      partidaId,
      equipoNumero,
      userId,
      action: {
        type: 'path',
        path: lastLine
      }
    });
  };

  // Manejar fin de dibujo
  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  // Limpiar dibujo del usuario actual
  const clearUserDrawing = () => {
    lines.current = lines.current.filter(line => line.userId !== userId);
    remoteLines.current = remoteLines.current.filter(line => line.userId !== userId);
    
    tintaConsumida.current = 0;
    setTinta(MAX_TINTA);

    // Notificar al backend
    socket.emit('drawingAction', {
      partidaId,
      equipoNumero,
      userId,
      action: {
        type: 'clear',
        userId
      }
    });

    Swal.fire({
      title: 'Tinta recargada',
      text: '¡Puedes volver a dibujar!',
      icon: 'success',
      timer: 1000,
      showConfirmButton: false
    });
  };

  // Cambiar herramienta
  const changeTool = (newTool) => {
    setTool(newTool);
    if (newTool === 'eraser') {
      setLastColor(color);
    } else if (newTool === 'brush') {
      setColor(lastColor);
    }
  };

  // Cargar dibujos para demostración
  const loadDemoDrawings = (teams) => {
    const validTeams = Array.isArray(teams) ? teams : [];
    setTotalTeams(validTeams.length);
    
    validTeams.forEach(team => {
      const teamNumber = Number(team);
      if (isNaN(teamNumber)) return;

      socket.emit('getDrawingForDemo', { 
        partidaId, 
        equipoNumero: teamNumber 
      }, (imageData) => {
        if (imageData) {
          setDemoDrawings(prev => ({
            ...prev,
            [teamNumber]: imageData
          }));
        }
      });
    });
  };

  // Configurar listeners de socket
  useEffect(() => {
    if (!socket) return;

    // Escuchar acciones de dibujo remotas
    socket.on('drawingAction', (action) => {
      if (action.type === 'path') {
        remoteLines.current = [...remoteLines.current, action.path];
      } else if (action.type === 'clear') {
        remoteLines.current = remoteLines.current.filter(line => line.userId !== action.userId);
      }
    });

    // Escuchar inicio de demostración
    socket.on('drawingDemoStarted', (teams) => {
      setShowDemo(true);
      setCurrentDemoTeam(Math.min(...teams.map(Number)));
      loadDemoDrawings(teams);
    });

    // Solicitar estado inicial del juego
    socket.emit('initDrawingGame', { partidaId, equipoNumero });

    // Escuchar estado inicial del juego
    socket.on('drawingGameState', ({ actions }) => {
      remoteLines.current = actions.map(action => action.path);
    });

    return () => {
      socket.off('drawingAction');
      socket.off('drawingDemoStarted');
      socket.off('drawingGameState');
    };
  }, [socket, partidaId, equipoNumero]);

  // Mostrar demostración
  if (showDemo && currentDemoTeam) {
    return (
      <div className="demo-container">
        <h2>Demostración de Dibujos</h2>
        <div className="demo-info">
          Mostrando dibujo del Equipo {currentDemoTeam} de {totalTeams}
        </div>
        
        <div className="demo-image-container">
          {demoDrawings[currentDemoTeam] ? (
            <img 
              src={demoDrawings[currentDemoTeam]} 
              alt={`Dibujo del Equipo ${currentDemoTeam}`}
              className="demo-image"
            />
          ) : (
            <div className="no-drawing">Dibujo no disponible</div>
          )}
        </div>

        <div className="demo-controls">
          <button 
            onClick={prevDemoDrawing} 
            disabled={currentDemoTeam <= 1}
          >
            Anterior
          </button>
          <button 
            onClick={nextDemoDrawing} 
            disabled={currentDemoTeam >= totalTeams}
          >
            Siguiente
          </button>
        </div>
      </div>
    );
  }

  // Paleta de colores
  const colorPalette = [
    '#FF0000', '#FF3300', '#FF6600', '#FF9900', '#FFCC00', '#FFFF00',
    '#00FF00', '#00CC33', '#009966', '#006699', '#0033CC', '#0000FF',
    '#6600FF', '#9933FF', '#CC66FF', '#FF00FF', '#FF33CC', '#FF6699',
    '#000000', '#FFFFFF', '#888888'
  ];

  return (
    <div className="drawing-game-container">
      <div className="drawing-tools-horizontal-extended">
        {/* Sección de colores */}
        <div className="colors-section-extended">
          <div className="color-palette-wide">
            <div className="color-rows-container">
              <div className="color-row">
                {colorPalette.map((colorHex, index) => (
                  <button
                    key={`color-${index}`}
                    className={`color-chip ${color === colorHex ? 'active' : ''}`}
                    style={{ backgroundColor: colorHex }}
                    onClick={() => handleColorSelect(colorHex)}
                  />
                ))}
              </div>
            </div>
            <div className="custom-color-container">
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="custom-color-picker-large"
              />
            </div>
          </div>
        </div>                    
        
        {/* Sección de herramientas */}
        <div className="tools-section-extended">                    
          <div className="tool-row">
            <button 
              className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
              onClick={() => changeTool('brush')}
              title="Pincel"
            >
              <i className="fas fa-paint-brush"></i>
            </button>                                   
            <button 
              className="tool-btn"
              onClick={clearUserDrawing}
              title="Limpiar mi dibujo"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
            <div className="tinta-tank-wrapper">
              <div className="tinta-tank-label">Tanque de Tinta</div>
              <div className="tinta-tank-container">
                <div
                  className={`tinta-tank-fill ${
                    tinta <= 1000 ? 'tinta-tank-critical' : tinta <= 3000 ? 'tinta-tank-low' : ''
                  }`}
                  style={{ width: `${(tinta / MAX_TINTA) * 100}%` }}
                />
              </div>
              <div className="tinta-tank-text">
                {tinta} / {MAX_TINTA}
              </div>
            </div>
          </div>
        </div>              
        
        {/* Control de tamaño */}
        <div className="size-section">
          <div className="size-controls-horizontal">            
            <div className="size-indicator">              
              <input
                type="range"
                min="1"
                max="30"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="size-slider-horizontal"
              />
            </div>
            <span>{brushSize}px</span>
          </div>
        </div>
        
        {/* Vista previa del pincel */}
        <div 
          className="brush-preview-horizontal"
          style={{
            width: `${brushSize}px`,
            height: `${brushSize}px`,
            background: tool === 'eraser' ? '#FFFFFF' : color,
            borderRadius: '50%'
          }}
        />
      </div>
      
      {/* Canvas de dibujo */}
      <div className="canvas-container">
        <Stage
          width={800}
          height={600}
          ref={stageRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <Layer>
            {/* Fondo blanco */}
            <Rect 
              width={800}
              height={600}
              fill="#ffffff"
              listening={false}
            />
            
            {/* Líneas remotas */}
            {remoteLines.current.map((line, i) => (
              <Line
                key={`remote-${i}`}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            ))}
            
            {/* Líneas locales */}
            {lines.current.map((line, i) => (
              <Line
                key={`local-${i}`}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default DrawingGame;