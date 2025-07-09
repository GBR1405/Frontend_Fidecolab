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

  const difficulty = gameConfig.dificultad.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const imageUrl = gameConfig.tema;

  const gridSize = {
    facil: 6,
    normal: 7,
    dificil: 8
  }[difficulty] || 6;

  const pieceSize = 600 / gridSize;

  useEffect(() => {
    if (progress === 100) {
      setInteractionLocked(true);
      import('canvas-confetti').then(confetti => {
        confetti.default({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 }
        });
      });
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

  // Cargar imagen y solicitar estado del puzzle
  useEffect(() => {
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

      // Solicitar estado actual del puzzle al servidor
      socket.emit('requestPuzzleState', { partidaId, equipoNumero });
    };

    return () => {
      // Limpiar listeners al desmontar
      socket.off('puzzleGameState');
      socket.off('puzzleUpdate');
    };
  }, [imageUrl, difficulty, socket, partidaId, equipoNumero]);

  // Escuchar estado inicial del puzzle
  useEffect(() => {
    if (!socket) return;

    const handleInit = (game) => {
      if (!game || !game.state) return;
      
      setPieces(game.state.pieces);
      setSwapsLeft(game.config.swapsLeft);
      setProgress(game.state.progress);
      setSelectedIds([]);
      setInteractionLocked(game.state.progress === 100);
    };

    socket.on('puzzleGameState', handleInit);

    return () => {
      socket.off('puzzleGameState', handleInit);
    };
  }, [socket]);

  // Escuchar actualizaciones del puzzle
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = ({ pieces, selected, swapsLeft, progress }) => {
      setPieces(pieces);
      setSelectedIds(selected);
      setSwapsLeft(swapsLeft);
      setProgress(progress);
      setInteractionLocked(progress === 100);
    };

    socket.on('puzzleUpdate', handleUpdate);
    return () => socket.off('puzzleUpdate', handleUpdate);
  }, [socket]);

  // Manejar clic en una pieza
  const handlePieceClick = useCallback((pieceId) => {
    if (interactionLocked) return;
    
    socket.emit('selectPuzzlePiece', {
      partidaId,
      equipoNumero,
      pieceId,
      userId
    });
  }, [socket, partidaId, equipoNumero, userId, interactionLocked]);

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
          cursor: interactionLocked ? 'default' : 'pointer',
          borderRadius: '8px',
          transition: 'all 0.2s ease'
        }}
        onClick={() => handlePieceClick(piece.id)}
      />
    );
  };

  return (
    <div className="puzzle-game">
      <div className="top-bar">
        <h2 className="game-title">Rompecabezas</h2>
        <div className="progress-box">
          <span className="progress-label">Progreso:</span>
          <span className="progress-value">{progress}%</span>
        </div>
      </div>

      <div className="main-layout">
        <div className="left-panel">
          <div className="reference-image">
            <img src={imageUrl} alt="Referencia" className="ref-img" />
            <p className="ref-label">Imagen de referencia</p>
          </div>
          <div className="swaps-box">
            <p><strong>Swaps restantes:</strong> {swapsLeft}</p>
          </div>
        </div>

        <div
          className="puzzle-container"
          style={{
            width: `${pieceSize * gridSize}px`,
            height: `${pieceSize * gridSize}px`
          }}
        >
          {imageLoaded && pieces.map(renderPiece)}
        </div>
      </div>
    </div>
  );
};

export default PuzzleGame;