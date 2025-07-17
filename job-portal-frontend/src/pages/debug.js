import Swal from 'sweetalert2';
import { useEffect } from 'react';
import sound from '../docs/login.mp3';
import 'animate.css';

const useDebugMode = () => {
  useEffect(() => {
    // Código Konami
    const KONAMI_CODE = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'KeyB', 'KeyA', 'Enter'
    ];
    
    let inputSequence = [];
    let konamiTimeoutId = null;
    const TIME_LIMIT = 5000;
    const audio = new Audio(sound);

    // Easter Egg de texto "fidecolab"
    let textInput = '';
    let textTimeoutId = null;
    const TEXT_TIMEOUT = 3000;

    const resetKonamiSequence = () => {
      inputSequence = [];
      if (konamiTimeoutId) {
        clearTimeout(konamiTimeoutId);
        konamiTimeoutId = null;
      }
    };

    const resetTextInput = () => {
      textInput = '';
      if (textTimeoutId) {
        clearTimeout(textTimeoutId);
        textTimeoutId = null;
      }
    };

    const showDedicationCard = () => {
      Swal.fire({
        title: '❤️ Para Nuestros Usuarios ❤️',
        html: `
          <div class="animate__animated animate__zoomIn" style="text-align: center;">
            <img src="https://i.imgur.com/JR8hWFH.jpg" 
                 style="width: 200px; border-radius: 50%; border: 5px solid #ff6b6b; margin-bottom: 20px;" 
                 class="animate__animated animate__pulse animate__infinite"/>
            <h3 class="animate__animated animate__fadeInUp" style="color: #ff6b6b;">¡Gracias por ser parte de FideColab!</h3>
            <p class="animate__animated animate__fadeInUp animate__delay-1s">Este proyecto fue creado con ❤️ por el equipo de desarrollo</p>
            <div style="margin-top: 20px; font-size: 24px;">
              <span class="animate__animated animate__bounceIn animate__delay-2s">⭐</span>
              <span class="animate__animated animate__bounceIn animate__delay-3s">🌟</span>
              <span class="animate__animated animate__bounceIn animate__delay-4s">✨</span>
            </div>
            <audio autoplay>
              <source src="https://www.soundjay.com/misc/sounds/magic-chime-01.mp3" type="audio/mpeg">
            </audio>
          </div>
        `,
        width: '80%',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        backdrop: `
          rgba(0,0,0,0.5)
          url("https://media.giphy.com/media/3o7TKsQ8UQ4D7GRkcg/giphy.gif")
          center center
          no-repeat
        `,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
          container: 'animate__animated animate__fadeIn',
          popup: 'special-card',
          closeButton: 'close-button'
        },
        willOpen: () => {
          document.querySelector('.special-card').classList.add('animate__animated', 'animate__zoomIn');
        },
        willClose: () => {
          document.querySelector('.special-card').classList.add('animate__animated', 'animate__zoomOut');
        }
      });
    };

    const handleKeyDown = (event) => {
      if (event.repeat) return;

      // Procesamiento del código Konami
      const currentKey = event.code;
      const expectedKey = KONAMI_CODE[inputSequence.length];
      const isCorrectKey = currentKey === expectedKey;

      if (isCorrectKey) {
        inputSequence.push(currentKey);
      } else {
        resetKonamiSequence();
      }

      if (konamiTimeoutId) clearTimeout(konamiTimeoutId);
      konamiTimeoutId = setTimeout(resetKonamiSequence, TIME_LIMIT);

      if (inputSequence.length === KONAMI_CODE.length) {
        resetKonamiSequence();
        audio.play().catch(e => console.error("Error al reproducir sonido:", e));
        Swal.fire({
          title: 'Secreto encontrado!',
          html: '⭐ FELICIDADES ⭐',
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
        });
      }

      // Procesamiento del texto "fidecolab"
      if (event.key.length === 1) {
        textInput += event.key.toLowerCase();
        if (textTimeoutId) clearTimeout(textTimeoutId);
        textTimeoutId = setTimeout(resetTextInput, TEXT_TIMEOUT);
        
        if (textInput.includes('fidecolab')) {
          resetTextInput();
          showDedicationCard();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      resetKonamiSequence();
      resetTextInput();
    };
  }, []);
};

export default useDebugMode;