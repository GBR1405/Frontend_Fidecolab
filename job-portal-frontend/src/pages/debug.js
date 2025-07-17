// debug.js
import Swal from 'sweetalert2';
import { useEffect } from 'react';

const useDebugMode = () => {
  useEffect(() => {
    const KONAMI_CODE = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'KeyB', 'KeyA', 'Enter'
    ];
    
    let inputSequence = [];
    let timeoutId = null;
    const TIME_LIMIT = 5000; // 5 segundos

    const resetSequence = () => {
      inputSequence = [];
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const handleKeyDown = (event) => {
      // Ignorar repeticiones de teclas
      if (event.repeat) return;

      // Agregar la tecla actual a la secuencia
      inputSequence.push(event.code);
      
      // Verificar si coincide con el código Konami
      if (inputSequence.length > KONAMI_CODE.length) {
        inputSequence.shift();
      }

      // Reiniciar el temporizador con cada tecla válida
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(resetSequence, TIME_LIMIT);

      // Verificar coincidencia completa
      if (inputSequence.length === KONAMI_CODE.length && 
          inputSequence.every((key, i) => key === KONAMI_CODE[i])) {
        resetSequence();
        Swal.fire({
          title: '¡Modo Depuración Activado!',
          text: 'Has descubierto la función secreta.',
          icon: 'success',
          confirmButtonText: '¡Genial!',
          background: '#1a1a2e',
          color: '#ffffff'
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      resetSequence();
    };
  }, []);
};

export default useDebugMode;