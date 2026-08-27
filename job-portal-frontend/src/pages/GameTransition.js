import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faBrain,
  faFlagCheckered,
  faPaintBrush,
  faTint,
  faEraser,
  faVoteYea,
  faHeart,
  faComments,
  faHandPointer,
  faLock,
  faExchangeAlt,
  faShoePrints,
  faPlay
} from '@fortawesome/free-solid-svg-icons';
import "../styles/TransicionesSimulacion.css";

const GAME_EMOJIS = {
  memoria: '🧠',
  dibujo: '🎨',
  ahorcado: '💀',
  rompecabezas: '🧩'
};

const INSTRUCTIONS_BY_GAME = {
  memoria: [
    { icon: faHandPointer, text: 'Haz clic para revelar dos piezas a la vez.' },
    { icon: faBrain, text: 'Si coinciden se quedan reveladas; si no, se voltean de nuevo. ¡Recuerden bien sus posiciones!' },
    { icon: faFlagCheckered, text: 'Trabajen en equipo para encontrar todas las parejas primero.' }
  ],
  dibujo: [
    { icon: faPaintBrush, text: 'Dibujen entre todo el equipo el tema asignado. ¡Hablen y pónganse de acuerdo!' },
    { icon: faTint, text: 'Tienen un tanque de tinta limitado para dibujar.' },
    { icon: faEraser, text: 'Cuidado: si se agota la tinta, el dibujo se reinicia desde cero.' }
  ],
  ahorcado: [
    { icon: faHeart, text: 'Tienen un límite de respuestas falladas, piénsenlo bien antes de arriesgar.' },
    { icon: faComments, text: 'Investiguen y discutan en equipo antes de responder.' },
    { icon: faVoteYea, text: 'Voten por la letra que crean que es la mejor opción.' }
  ],
  rompecabezas: [
    { icon: faExchangeAlt, text: 'Selecciona dos piezas para intercambiarlas entre sí.' },
    { icon: faLock, text: 'Si un compañero ya seleccionó una pieza, espera a que la cancele o la cambie.' },
    { icon: faShoePrints, text: '¡Tienen un límite de movimientos, úsenlos con inteligencia!' }
  ]
};

const getGameKey = (gameName = '') => {
  const name = gameName.toLowerCase();
  return Object.keys(INSTRUCTIONS_BY_GAME).find((key) => name.includes(key)) || null;
};

const GameTransition = ({
  transitionPhase,
  transitionGame,
  onStart,
  isFirstGame = false
}) => {
  const gameKey = getGameKey(transitionGame?.name);
  const instructions = gameKey ? INSTRUCTIONS_BY_GAME[gameKey] : [];
  const emoji = gameKey ? GAME_EMOJIS[gameKey] : '';

  return (
    <div className={`_est_overlay ${transitionPhase !== 'idle' ? '_est_active' : ''}`}>
      {transitionPhase === 'next-game' && (
        <>
          <div className="_est_next-game">
            <div className="_est_next-text">
              {isFirstGame ? '¡Comencemos con el primer juego!' : 'Siguiente Juego:'}
            </div>
            <div className="_est_game-name">
              {transitionGame?.name}
              <span className="_est_game-icon">{emoji}</span>
            </div>
          </div>
          <div className="_est_line-horizontal"></div>
        </>
      )}

      {(transitionPhase === 'instructions' || transitionPhase === 'ready') && (
        <div className="_est_instructions">
          <span className="_est_instruction-game">{transitionGame?.name}</span>
          <h2 className="_est_instruction-title">Instrucciones</h2>

          <div className="_est_instruction-row">
            {instructions.map((item, index) => (
              <div key={index} className="_est_instruction-item">
                <div className="_est_icon-badge">
                  <FontAwesomeIcon icon={item.icon} className="_est_icon" />
                </div>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {transitionPhase === 'ready' && (
            <div className="_est_ready-block">
              <button className="_est_start-btn" onClick={onStart}>
                <FontAwesomeIcon icon={faPlay} /> ¡Comenzar!
              </button>
              <p className="_est_start-hint">
                <FontAwesomeIcon icon={faHandPointer} /> Haz clic en el botón para empezar a jugar
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameTransition;
