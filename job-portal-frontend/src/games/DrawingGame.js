import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import Swal from 'sweetalert2';
import '../styles/games.css';

const DrawingGame = ({ gameConfig, onGameComplete }) => {
  const { partidaId, equipoNumero } = useParams();
  const socket = useSocket();
  const canvasRef = useRef(null);
  const fabricCanvas = useRef(null);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('brush');
  const [showDemo, setShowDemo] = useState(false);
  const [currentDemoTeam, setCurrentDemoTeam] = useState(1);
  const [demoDrawings, setDemoDrawings] = useState({});
  const [totalTeams, setTotalTeams] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastColor, setLastColor] = useState('#000000');
  
  const userId = localStorage.getItem('userId');
  const userActions = useRef({});
  const pendingRemoteActions = useRef([]);
  const isProcessingRemoteActions = useRef(false);

  const { fabric } = require('fabric');

  const [tinta, setTinta] = useState(5000); // cantidad máxima inicial
  const tintaConsumida = useRef(0);
  const MAX_TINTA = 5000;

  // Inicializar canvas con Fabric.js
  useEffect(() => {
  if (!socket || !canvasRef.current) return;

  // Crear canvas de Fabric.js
  fabricCanvas.current = new fabric.Canvas(canvasRef.current, {
    isDrawingMode: true,
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
  });

  // Configurar pincel inicial
  fabricCanvas.current.freeDrawingBrush.color = color;
  fabricCanvas.current.freeDrawingBrush.width = brushSize;

  // Bloquear dibujo si no hay tinta
  fabricCanvas.current.on('mouse:down', () => {
    if (tinta <= 0) {
      fabricCanvas.current.isDrawingMode = false;
    } else {
      fabricCanvas.current.isDrawingMode = true;
    }
  });

  // Escuchar acciones de dibujo remotas
  socket.on('drawingAction', (action) => {
    // Asegúrate de que siempre haya userId en la acción
    handleRemoteAction(action);
  });

  // Escuchar inicio de demostración
  socket.on('drawingDemoStarted', (teams) => {
    setShowDemo(true);
    setCurrentDemoTeam(Math.min(...teams.map(Number)));
    loadDemoDrawings(teams);
  });

  // Solicitar estado inicial del juego
  socket.emit('initDrawingGame', { partidaId, equipoNumero });

  socket.on('drawingGameState', ({ actions }) => {
    if (fabricCanvas.current) {
      fabricCanvas.current.clear();
      fabricCanvas.current.backgroundColor = '#ffffff';
    }
    actions.forEach(action => renderAction(action));
  });

  // Configurar eventos del canvas
  setupCanvasEvents();

  return () => {
    socket.off('drawingAction');
    socket.off('drawingDemoStarted');
    if (fabricCanvas.current) {
      fabricCanvas.current.dispose();
    }
  };
}, [socket, partidaId, equipoNumero]);


  // Configurar eventos del canvas
  const setupCanvasEvents = () => {
    const canvas = fabricCanvas.current;

    canvas.on('path:created', (e) => {
      const path = e.path;

      // Serializa antes de calcular
      const pathData = path.toObject(['path', 'stroke', 'strokeWidth', 'userId']);
      const pathLength = path.path?.length || 0;

      // Si se quedó sin tinta
      if (tintaConsumida.current + pathLength >= MAX_TINTA) {
        canvas.remove(path);
        Swal.fire('¡Sin tinta!', 'Debes limpiar tu dibujo para recargar.', 'warning');
        return;
      }

      // Marcar como autor y guardar local
      path.userId = userId;
      tintaConsumida.current += pathLength;
      setTinta(prev => prev - pathLength);

      // Enviar al backend
      socket.emit('drawingAction', {
        partidaId,
        equipoNumero,
        userId,
        action: {
          type: 'path',
          path: pathData
        }
      });

      // También almacenar localmente
      if (!userActions.current[userId]) {
        userActions.current[userId] = [];
      }
      userActions.current[userId].push({
        type: 'path',
        path: pathData
      });
    });
  };

  // Emitir acción de dibujo al servidor
  const emitDrawingAction = (action) => {
    if (!socket) return;
    
    // Almacenar acción localmente para renderizado inmediato
    handleLocalAction(action);
    
    // Enviar al servidor
    socket.emit('drawingAction', { 
      partidaId, 
      equipoNumero, 
      userId, 
      action 
    });
  };

  // Manejar acción local (renderizado inmediato)
  const handleLocalAction = (action) => {
    if (!userActions.current[userId]) {
      userActions.current[userId] = [];
    }
    userActions.current[userId].push(action);
    renderAction(action);
  };

  // Manejar acción remota (de otros usuarios)
  const handleRemoteAction = (action) => {
  // Quita este filtro, así también ves tus propios trazos
  // if (action.userId === userId) return;
  pendingRemoteActions.current.push(action);
  if (!isProcessingRemoteActions.current) {
    processRemoteActions();
  }
};

  // Procesar acciones remotas en cola
  const processRemoteActions = () => {
    if (pendingRemoteActions.current.length === 0) {
      isProcessingRemoteActions.current = false;
      return;
    }

    isProcessingRemoteActions.current = true;
    const action = pendingRemoteActions.current.shift();
    
    if (!userActions.current[action.userId]) {
      userActions.current[action.userId] = [];
    }
    userActions.current[action.userId].push(action);
    renderAction(action);

    // Usar requestAnimationFrame para procesar en el siguiente frame
    requestAnimationFrame(processRemoteActions);
  };

  // Renderizar una acción en el canvas
  const renderAction = (action) => {
  const canvas = fabricCanvas.current;
  if (!canvas) return;

  switch (action.type) {
    case 'path':
      const pathObj = new fabric.Path(action.path.path, {
        stroke: action.path.stroke,
        strokeWidth: action.path.strokeWidth,
        fill: null,
        selectable: false,
        evented: false
      });
      pathObj.userId = action.userId;

      // Agregar al canvas
      canvas.add(pathObj);

      // Asegurar que se vea
      canvas.renderAll();
      break;

    case 'clear':
      if (action.userId === userId) {
        clearUserDrawing();
      }
      break;

    case 'fill':
      canvas.setBackgroundColor(action.color, canvas.renderAll.bind(canvas));
      break;
  }
};

  // Limpiar dibujo del usuario actual
  const clearUserDrawing = () => {
  const canvas = fabricCanvas.current;
  if (!canvas) return;

  const objects = canvas.getObjects();
  objects.forEach(obj => {
    if (obj.userId === userId) {
      canvas.remove(obj);
    }
  });
  canvas.renderAll();

  tintaConsumida.current = 0;
  setTinta(MAX_TINTA);

  // Animación o alerta
  Swal.fire({
    title: 'Tinta recargada',
    text: '¡Puedes volver a dibujar!',
    icon: 'success',
    timer: 1000,
    showConfirmButton: false
  });
};

  // Guardar el dibujo actual
  const saveDrawing = () => {
    if (!fabricCanvas.current || !socket) return;
    
    const imageData = fabricCanvas.current.toDataURL({
      format: 'png',
      quality: 0.8
    });
    
    socket.emit('saveDrawing', { 
      partidaId, 
      equipoNumero, 
      imageData 
    });
  };

  // Cambiar herramienta
  const changeTool = (newTool) => {
    setTool(newTool);
    if (newTool === 'eraser') {
      setLastColor(color);
      setColor('#ffffff');
    } else if (newTool === 'brush') {
      setColor(lastColor);
    }
  };

  // Limpiar el canvas del usuario actual
  const clearCanvas = () => {
    if (!socket) return;
    
    // Enviar acción de limpieza
    socket.emit('clearMyDrawing', { 
      partidaId, 
      equipoNumero, 
      userId 
    });
    
    // Limpiar localmente
    clearUserDrawing();
  };

  // Rellenar el canvas
  const fillCanvas = () => {
    if (!socket) return;
    
    const action = { 
      type: 'fill', 
      color,
      userId
    };
    
    socket.emit('drawingAction', { 
      partidaId, 
      equipoNumero, 
      action 
    });
    
    // Aplicar localmente
    fabricCanvas.current.setBackgroundColor(color, fabricCanvas.current.renderAll.bind(fabricCanvas.current));
  };

  // Cargar dibujos para demostración
  const loadDemoDrawings = (teams) => {
    const validTeams = Array.isArray(teams) ? teams : [];
    
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

  // Cambiar al siguiente dibujo en la demostración
  const nextDemoDrawing = () => {
    const nextTeam = currentDemoTeam + 1;
    if (nextTeam <= totalTeams) {
      socket.emit('changeDemoTeam', { partidaId, equipoNumero: nextTeam });
    }
  };

  // Cambiar al dibujo anterior en la demostración
  const prevDemoDrawing = () => {
    const prevTeam = currentDemoTeam - 1;
    if (prevTeam >= 1) {
      socket.emit('changeDemoTeam', { partidaId, equipoNumero: prevTeam });
    }
  };

  // Seleccionar color
  const handleColorSelect = (colorHex) => {
    setColor(colorHex);
    if (tool === 'brush') {
      fabricCanvas.current.freeDrawingBrush.color = colorHex;
    }
    if (tool === 'eraser') {
      setTool('brush');
      setColor(colorHex);
    }
    setLastColor(colorHex);
  };

  // Actualizar tamaño del pincel
  useEffect(() => {
    if (fabricCanvas.current) {
      fabricCanvas.current.freeDrawingBrush.width = brushSize;
    }
  }, [brushSize]);

  // Actualizar color del pincel
  useEffect(() => {
    if (fabricCanvas.current && tool === 'brush') {
      fabricCanvas.current.freeDrawingBrush.color = color;
    }
  }, [color, tool]);

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
              onClick={clearCanvas}
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
                onChange={(e) => setBrushSize(e.target.value)}
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
        <canvas
          ref={canvasRef}
          className="drawing-canvas-enhanced"
        />
      </div>
    </div>
  );
};

export default DrawingGame;