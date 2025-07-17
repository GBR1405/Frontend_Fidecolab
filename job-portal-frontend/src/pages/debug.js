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
      console.log('%c❌ Secuencia reiniciada', 'color: red; font-weight: bold;');
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

      // Debug visual en consola
      if (isCorrectKey) {
        console.log(`%c✅ ${currentKey}`, 'color: green; font-weight: bold;');
      } else {
        console.log(`%c❌ ${currentKey} (Se esperaba: ${expectedKey || 'nada'})`, 'color: red; font-weight: bold;');
      }

      // Agregar la tecla actual a la secuencia solo si es correcta
      if (isCorrectKey) {
        inputSequence.push(currentKey);
      } else {
        resetSequence();
        return;
      }
      
      // Verificar si excedió el largo máximo
      if (inputSequence.length > KONAMI_CODE.length) {
        inputSequence.shift();
      }

      // Reiniciar temporizador
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log('%c⏰ Tiempo agotado!', 'color: orange; font-weight: bold;');
        resetSequence();
      }, TIME_LIMIT);

      // Verificar coincidencia completa
      if (inputSequence.length === KONAMI_CODE.length) {
        console.log('%c🎉 ¡Código Konami correcto!', 'color: #00FF00; font-weight: bold; font-size: 16px;');
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

    console.log('%c🔍 Modo Debug: Escuchando código Konami...', 'color: #4CAF50; font-weight: bold;');
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      resetSequence();
    };
  }, []);
};

export default useDebugMode;