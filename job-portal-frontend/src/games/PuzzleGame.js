import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import '../styles/games_puzzle.css';

const PuzzleGame = ({ gameConfig }) => {
  const { partidaId, equipoNumero } = useParams();
  const socket = useSocket();
  const userId = localStorage.getItem('userId');

  const [pieces, setPieces] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [swapsLeft, setSwapsLeft] = useState(0);
  const [progress, setProgress] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [interactionLocked, setInteractionLocked] = useState(false);

  const [imageCrop, setImageCrop] = useState({
    size: 1, xOffset: 0, yOffset: 0
  });

  const difficulty = gameConfig.dificultad || 'fácil';
  const normalizedDifficulty = difficulty.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '');
  console.log('Dificultad seleccionada:', difficulty);
  const imageUrl = gameConfig.tema;

    const gridSize = {
    'facil': 6,
    'normal': 7,
    'dificil': 8
  }[normalizedDifficulty] || 6;

  const pieceSize = 600 / gridSize; // Ajuste responsivo si lo deseas

  useEffect(() => {
  if (progress === 100) {
    // Bloquear clics o swaps
    setInteractionLocked(true);

    // Mostrar confeti o mensaje
    import('canvas-confetti').then(confetti => {
      confetti.default({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    });

    // O puedes usar SweetAlert
    import('sweetalert2').then(Swal => {
      Swal.default.fire({
        title: '¡Felicidades!',
        text: '¡Puzzle completado!',
        icon: 'success',
        confirmButtonText: 'OK'
      });
    });
  }
}, [progress]);


  // 🔄 Iniciar juego al cargar imagen
  useEffect(() => {
  if (!imageUrl || !difficulty || !socket) return;

  const img = new Image();
  img.src = imageUrl;
  img.onload = () => {
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const squareSize = Math.min(width, height);
    const xOffset = (width - squareSize) / 2;
    const yOffset = (height - squareSize) / 2;

    setImageCrop({ size: squareSize, xOffset, yOffset });
    setImageLoaded(true);

    setPieces([]);
    setSelectedIds([]);
    setSwapsLeft(0);
    setProgress(0);
    setInteractionLocked(false);

    socket.emit('initPuzzleGame', {
      partidaId,
      equipoNumero,
      difficulty,
      imageUrl
    });
  };
}, [imageUrl, difficulty, partidaId, equipoNumero, socket]);

  

  // 📥 Recibir estado inicial o tras reconexión
  useEffect(() => {
    if (!socket) return;

    const handleInit = (game) => {
      setPieces(game.state.pieces);
      setSwapsLeft(game.config.swapsLeft);
      setProgress(game.state.progress);
      setSelectedIds([]);
    };

    socket.on('puzzleGameState', handleInit);
    socket.emit('requestPuzzleState', { partidaId, equipoNumero });

    return () => {
      socket.off('puzzleGameState', handleInit);
    };
  }, [socket, partidaId, equipoNumero]);

  // 🧩 Recibir actualizaciones tras swap
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = ({ pieces, selected, swapsLeft, progress }) => {
      setPieces(pieces);
      setSelectedIds(selected);
      setSwapsLeft(swapsLeft);
      setProgress(progress);
    };

    socket.on('puzzleUpdate', handleUpdate);
    return () => socket.off('puzzleUpdate', handleUpdate);
  }, [socket]);

  // 🖱️ Al hacer clic en una pieza
  const handlePieceClick = useCallback((pieceId) => {
    socket.emit('selectPuzzlePiece', {
      partidaId,
      equipoNumero,
      pieceId,
      userId
    });
  }, [socket, partidaId, equipoNumero, userId]);

  // 📐 Estilo para cada pieza
  const renderPiece = (piece) => {
    const isSelected = selectedIds.includes(piece.id);
    const isCorrect = piece.currentRow === piece.correctRow && piece.currentCol === piece.correctCol;

    return (
      <div
        key={piece.id}
        className={`puzzle-piece ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''}`}
        style={{
          width: `${pieceSize}px`,
          height: `${pieceSize}px`,
          position: 'absolute',
          top: `${piece.currentRow * pieceSize}px`,
          left: `${piece.currentCol * pieceSize}px`,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: `${gridSize * 100}%`,
          backgroundPosition: `${(piece.correctCol / (gridSize - 1)) * 100}% ${(piece.correctRow / (gridSize - 1)) * 100}%`,
          border: isSelected ? '3px solid gold' : isCorrect ? '2px solid limegreen' : 'none',
          boxShadow: isCorrect ? '0 0 10px rgba(0,255,0,0.6)' : '0 0 3px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          borderRadius: '8px',
          transition: 'all 0.2s ease'
        }}
        onClick={() => handlePieceClick(piece.id)}
      />
    );
  };

  return (
  <div className="puzzle-game">
    
    {/* Contenedor del título y progreso */}
    <div className="top-bar">
      <h2 className="game-title">Rompecabezas</h2>
      <div className="progress-box">
        <span className="progress-label">Progreso:</span>
        <span className="progress-value">{progress}%</span>
      </div>
    </div>

    <div className="main-layout">
      
      {/* Columna izquierda: imagen de referencia + swaps */}
      <div className="left-panel">
        <div className="reference-image">
          <img src={imageUrl} alt="Referencia" className="ref-img" />
          <p className="ref-label">Imagen de referencia</p>
        </div>
        <div className="swaps-box">
          <p><strong>Swaps restantes:</strong> {swapsLeft}</p>
        </div>
      </div>

      {/* Columna derecha: tablero del puzzle */}
      <div
        className="puzzle-container"
        style={{
          width: `${pieceSize * gridSize}px`,
          height: `${pieceSize * gridSize}px`
        }}
      >
        {pieces.map(renderPiece)}
      </div>

    </div>
  </div>
);

};

export default PuzzleGame;
