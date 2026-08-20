import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import '../styles/games_puzzle.css';

const PuzzleGame = ({ gameConfig }) => {
  const { partidaId, equipoNumero } = useParams();
  const socket = useSocket();
  const userId = localStorage.getItem('userId');

  const [pieces, setPieces] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  // Selección de piezas de los demás miembros del equipo: { [userId]: [pieceId, ...] }
  const [otherSelections, setOtherSelections] = useState({});
  // Piezas cuyo "dueño" acaba de soltarlas, mantenidas un instante extra solo para animar la salida del icono
  const [leavingBadges, setLeavingBadges] = useState({});
  const prevOwnerMapRef = useRef({});
  const [swapsLeft, setSwapsLeft] = useState(0);
  const [progress, setProgress] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [interactionLocked, setInteractionLocked] = useState(false);

  const [imageCrop, setImageCrop] = useState({
    size: 1, xOffset: 0, yOffset: 0
  });

  const difficulty = gameConfig.dificultad.toLowerCase();
  const imageUrl = gameConfig.tema;

  const gridSize = {
    fácil: 6,
    facil: 6,
    normal: 7,
    difícil: 8,
    dificil: 8
  }[difficulty] || 6;

  const pieceSize = 600 / gridSize;

  // 🎉 Puzzle completo
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

  // 🔄 Cargar imagen e iniciar juego
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

      socket.emit('initPuzzleGame', {
        partidaId,
        equipoNumero,
        difficulty,
        imageUrl
      });
    };
  }, [imageUrl, socket]);

  // 📥 Estado inicial
  useEffect(() => {
    if (!socket) return;

    const handleInit = (game) => {
      setPieces(game.state.pieces);
      setSwapsLeft(game.config.swapsLeft);
      setProgress(game.state.progress);
      setSelectedIds([]);
      setInteractionLocked(false);
      setOtherSelections({});
      setLeavingBadges({});
    };

    socket.on('puzzleGameState', handleInit);
    socket.emit('requestPuzzleState', { partidaId, equipoNumero });

    return () => {
      socket.off('puzzleGameState', handleInit);
    };
  }, [socket, partidaId, equipoNumero]);

  // 🧩 Después de cada swap
  // El backend no reenvía un "updateSelections" vacío cuando una pareja se
  // intercambia: solo emite puzzleUpdate. Como un swap siempre libera por
  // completo la pareja (2 piezas) del usuario que lo generó, basta con
  // limpiar cualquier selección (propia o ajena) que haya llegado a 2.
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = ({ pieces, swapsLeft, progress }) => {
      setPieces(pieces);
      setSwapsLeft(swapsLeft);
      setProgress(progress);

      setSelectedIds(prev => (prev.length >= 2 ? [] : prev));
      setOtherSelections(prev => {
        let changed = false;
        const updated = { ...prev };
        Object.keys(updated).forEach(uid => {
          if ((updated[uid]?.length || 0) >= 2) {
            updated[uid] = [];
            changed = true;
          }
        });
        return changed ? updated : prev;
      });

      if (progress === 100 || swapsLeft <= 0) {
        setInteractionLocked(true);
      }
    };

    socket.on('puzzleUpdate', handleUpdate);
    return () => socket.off('puzzleUpdate', handleUpdate);
  }, [socket]);

  // 🔁 Selección/deselección de piezas por parte del equipo
  useEffect(() => {
    if (!socket) return;

    // El servidor manda, en cada select/deselect, la selección COMPLETA y
    // actual de ese usuario. Reemplazar (no acumular) su entrada evita
    // depender de temporizadores locales que se desincronizan del backend.
    const handleUpdateSelections = ({ userId: senderId, selected }) => {
      if (senderId === userId) {
        setSelectedIds(selected);
      } else {
        setOtherSelections(prev => ({ ...prev, [senderId]: selected }));
      }
    };

    const handleBlockedPiece = (pieceId) => {
      console.log(`Pieza ${pieceId} está bloqueada`);
    };

    const handleNoSwapsLeft = () => {
      setInteractionLocked(true);
      alert('¡Ya no quedan movimientos!');
    };

    socket.on('updateSelections', handleUpdateSelections);
    socket.on('pieceBlocked', handleBlockedPiece);
    socket.on('noSwapsLeft', handleNoSwapsLeft);

    return () => {
      socket.off('updateSelections', handleUpdateSelections);
      socket.off('pieceBlocked', handleBlockedPiece);
      socket.off('noSwapsLeft', handleNoSwapsLeft);
    };
  }, [socket, userId]);

  // 🧑‍🤝‍🧑 Mapa pieceId -> userId de quien la tiene seleccionada actualmente
  const pieceOwnerMap = useMemo(() => {
    const map = {};
    Object.entries(otherSelections).forEach(([uid, ids]) => {
      (ids || []).forEach(id => { map[id] = uid; });
    });
    return map;
  }, [otherSelections]);

  // 🫧 Mantener el icono un instante extra tras soltarse, solo para animar su salida
  useEffect(() => {
    const prevMap = prevOwnerMapRef.current;
    const justReleased = {};

    Object.keys(prevMap).forEach(pieceId => {
      if (!pieceOwnerMap[pieceId]) {
        justReleased[pieceId] = prevMap[pieceId];
      }
    });

    if (Object.keys(justReleased).length > 0) {
      setLeavingBadges(prev => ({ ...prev, ...justReleased }));
      Object.keys(justReleased).forEach(pieceId => {
        setTimeout(() => {
          setLeavingBadges(prev => {
            if (!(pieceId in prev)) return prev;
            const { [pieceId]: _removed, ...rest } = prev;
            return rest;
          });
        }, 280);
      });
    }

    prevOwnerMapRef.current = pieceOwnerMap;
  }, [pieceOwnerMap]);

  // 📌 Al hacer clic en una pieza
  const handlePieceClick = useCallback((pieceId) => {
    if (interactionLocked || pieceOwnerMap[pieceId]) return;

    socket.emit('selectPuzzlePiece', {
      partidaId,
      equipoNumero,
      pieceId,
      userId
    });
  }, [socket, partidaId, equipoNumero, userId, interactionLocked, pieceOwnerMap]);

  // 🧱 Renderizar una pieza
  const renderPiece = (piece) => {
    const isSelected = selectedIds.includes(piece.id);
    const isCorrect = piece.currentRow === piece.correctRow && piece.currentCol === piece.correctCol;
    const ownerId = pieceOwnerMap[piece.id];
    const isBlocked = !!ownerId;
    const badgeOwnerId = ownerId || leavingBadges[piece.id];
    const isBadgeLeaving = !ownerId && !!leavingBadges[piece.id];

    return (
      <div
        key={piece.id}
        className={`puzzle-piece
          ${isSelected ? 'selected' : ''}
          ${isCorrect ? 'correct' : ''}
          ${isBlocked ? 'blocked' : ''}`}
        style={{
          width: `${pieceSize}px`,
          height: `${pieceSize}px`,
          position: 'absolute',
          top: `${piece.currentRow * pieceSize}px`,
          left: `${piece.currentCol * pieceSize}px`,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: `${gridSize * 100}%`,
          backgroundPosition: `${(piece.correctCol / (gridSize - 1)) * 100}% ${(piece.correctRow / (gridSize - 1)) * 100}%`,
          cursor: interactionLocked || isBlocked ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease'
        }}
        onClick={() => handlePieceClick(piece.id)}
      >
        {badgeOwnerId && (
          <img
            key={badgeOwnerId}
            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${badgeOwnerId}`}
            alt=""
            className={`puzzle-piece__owner-badge ${isBadgeLeaving ? 'is-leaving' : ''}`}
          />
        )}
      </div>
    );
  };

  return (    
    <div className="container__puzzle">
      <div className="details__group group--first">
        <p>Número de grupo</p>
        <span>{equipoNumero}</span>
      </div>
      <div className="details__group group--second">
        <p>Progreso</p>
        <span>{progress}%</span>
      </div>
      <div className="details__container container--first">                    
          <div className="container__header">
              <h3>Referencia</h3>
          </div>
          <div className="container__body">
              <img src={imageUrl} alt="Referencia" className="view__image" />
          </div>
      </div>      
      <div className="details__container container--second">                    
          <div className="container__header">
              <h3>Movimientos</h3>
          </div>
          <div className="container__body">
            <span>{swapsLeft}</span>
          </div>
      </div>          
      <div className="game__puzzle">
        <div className="puzzle__canvas"
          style={{
              width: `${pieceSize * gridSize}px`,
              height: `${pieceSize * gridSize}px`
            }}>
          {pieces.map(renderPiece)}
        </div>
      </div>                       
    </div>
  );
};

export default PuzzleGame;
