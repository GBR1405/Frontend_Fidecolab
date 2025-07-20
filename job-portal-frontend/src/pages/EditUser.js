import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Cookies from "js-cookie";
import CryptoJS from "crypto-js";


const apiUrl = process.env.REACT_APP_API_URL;
const secretKey = process.env.REACT_APP_SECRET_KEY;

const EditarPerfil = ({ setShowModal }) => {
  const [correo, setCorreo] = useState("");
  const [genero, setGenero] = useState("Indefinido");
  const [originalGenero, setOriginalGenero] = useState("Indefinido");

  useEffect(() => {
    const encrypted = Cookies.get("IFUser_Info");
    if (!encrypted) return;

    const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
    const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    setCorreo(decrypted.correo);
    setGenero(decrypted.genero || "Indefinido");
    setOriginalGenero(decrypted.genero || "Indefinido");

    mostrarModal();
  }, []);

  const actualizarGenero = async () => {
    if (genero === originalGenero) {
      return Swal.fire("Sin cambios", "No se modificó el género", "info");
    }

    try {
      const token = Cookies.get("authToken");
      const res = await fetch(`${apiUrl}/auth/user-edit`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correo,
          generoId: genero === "Hombre" ? 1 : genero === "Mujer" ? 2 : 3,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const encrypted = Cookies.get("IFUser_Info");
        const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
        const userData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        const updatedData = { ...userData, genero };

        Cookies.set(
          "IFUser_Info",
          CryptoJS.AES.encrypt(JSON.stringify(updatedData), secretKey).toString(),
          { expires: 7 }
        );

        Swal.fire("Éxito", "Género actualizado correctamente", "success").then(() => {
          window.location.reload();
        });
      } else {
        Swal.fire("Error", data.message || "No se pudo actualizar el género", "error");
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Error inesperado al actualizar el género", "error");
    }
  };

  const cambiarContraseña = async (actual, nueva, confirmada) => {
    if (!actual || !nueva || !confirmada) {
      return Swal.fire("Campos incompletos", "Debes llenar todos los campos", "warning");
    }

    if (nueva !== confirmada) {
      return Swal.fire("Error", "La nueva contraseña no coincide con la confirmación", "error");
    }

    try {
      const token = Cookies.get("authToken");

      const res = await fetch(`${apiUrl}/auth/user-update-password`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword: actual, newPassword: nueva }),
      });

      const data = await res.json();

      if (data.success) {
        Swal.fire("¡Listo!", "Contraseña actualizada correctamente", "success");
      } else {
        Swal.fire("Error", data.message || "No se pudo actualizar la contraseña", "error");
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Error inesperado al cambiar la contraseña", "error");
    }
  };

  const mostrarModal = () => {
    Swal.fire({
      title: "Editar Perfil",
      html: `
        <style>
          .swal2-input-custom {
            width: 100%;
            padding: 8px;
            margin-top: 5px;
            margin-bottom: 15px;
            border-radius: 5px;
            border: 1px solid #ccc;
          }
          .swal2-password-container {
            position: relative;
          }
          .swal2-eye {
            position: absolute;
            top: 50%;
            right: 10px;
            transform: translateY(-50%);
            cursor: pointer;
            font-size: 1rem;
            color: #555;
          }
        </style>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left;">
          <div>
            <label style="font-weight: bold; margin-top: 10px;">Género:</label>
            <select id="generoSelect" class="swal2-input-custom">
              <option value="Hombre" ${genero === "Hombre" ? "selected" : ""}>Hombre</option>
              <option value="Mujer" ${genero === "Mujer" ? "selected" : ""}>Mujer</option>
              <option value="Indefinido" ${genero === "Indefinido" ? "selected" : ""}>Indefinido</option>
            </select>
            <button id="btnGenero" style="${styleButton("#0d6efd")}">Actualizar Género</button>
          </div>

          <div>
            <label style="font-weight: bold;">Contraseña actual:</label>
            <div class="swal2-password-container">
              <input id="passActual" type="password" class="swal2-input-custom" />
              <i class="fa fa-eye swal2-eye" id="eyeActual"></i>
            </div>

            <label style="font-weight: bold;">Nueva contraseña:</label>
            <div class="swal2-password-container">
              <input id="passNueva" type="password" class="swal2-input-custom" />
              <i class="fa fa-eye swal2-eye" id="eyeNueva"></i>
            </div>

            <label style="font-weight: bold;">Confirmar contraseña:</label>
            <div class="swal2-password-container">
              <input id="passConfirm" type="password" class="swal2-input-custom" />
              <i class="fa fa-eye swal2-eye" id="eyeConfirm"></i>
            </div>

            <button id="btnPassword" style="${styleButton("#cdcf2a")}">Cambiar Contraseña</button>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      willClose: () => {
        if (setShowModal) setShowModal(false);
      },
      didOpen: () => {
        document.getElementById("generoSelect").addEventListener("change", (e) => {
          setGenero(e.target.value);
        });

        document.getElementById("btnGenero").addEventListener("click", () => {
          actualizarGenero();
        });

        document.getElementById("btnPassword").addEventListener("click", () => {
          const actual = document.getElementById("passActual").value;
          const nueva = document.getElementById("passNueva").value;
          const confirmada = document.getElementById("passConfirm").value;
          cambiarContraseña(actual, nueva, confirmada);
        });

        // Mostrar/Ocultar contraseñas
        ["Actual", "Nueva", "Confirm"].forEach((campo) => {
          const input = document.getElementById(`pass${campo}`);
          const eye = document.getElementById(`eye${campo}`);
          eye.addEventListener("click", () => {
            input.type = input.type === "password" ? "text" : "password";
            eye.classList.toggle("fa-eye");
            eye.classList.toggle("fa-eye-slash");
          });
        });
      },
    });
  };

  return null;
};

// Estilo de botones
const styleButton = (color) =>
  `width: 100%; padding: 10px; background: ${color}; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;`;

export default EditarPerfil;
