// debug.js
import Swal from 'sweetalert2';
import { useEffect } from 'react';
import sound from '../docs/login.mp3'; 

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
    const audio = new Audio(sound);

    const resetSequence = () => {
      inputSequence = [];
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const handleKeyDown = (event) => {
      if (event.repeat) return;

      const currentKey = event.code;
      const expectedKey = KONAMI_CODE[inputSequence.length];
      const isCorrectKey = currentKey === expectedKey;

      // Solo procesar si es la tecla correcta
      if (isCorrectKey) {
        inputSequence.push(currentKey);
      } else {
        resetSequence();
        return;
      }

      // Reiniciar temporizador
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(resetSequence, TIME_LIMIT);

      // Verificar coincidencia completa
      if (inputSequence.length === KONAMI_CODE.length) {
        resetSequence();
        
        // Reproducir sonido
        audio.play().catch(e => console.error("Error al reproducir sonido:", e));
        
        // Mostrar alerta con mejor manejo del Enter
        Swal.fire({
          title: 'Secreto encontrado!',
          html: '⭐ FELICIDIADES ⭐',
          icon: 'success',
          confirmButtonText: '¡Entendido!',
          background: '#1a1a2e',
          color: '#ffffff',
          allowEnterKey: false,
          backdrop: `
            rgba(0,0,123,0.4)
            url("https://media.tenor.com/8VMZ6wWu70IAAAAM/fish.gif")
            center top
            no-repeat
          `,
          showClass: {
            popup: 'animate__animated animate__fadeInDown'
          },
          hideClass: {
            popup: 'animate__animated animate__fadeOutUp'
          }
        }).then(() => {
          // Acciones adicionales después de cerrar
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