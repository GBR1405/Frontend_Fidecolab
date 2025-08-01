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

  const actualizarTodo = async () => {
    const generoNuevo = document.getElementById("generoSelect").value;
    const actual = document.getElementById("passActual").value;
    const nueva = document.getElementById("passNueva").value;
    const confirmada = document.getElementById("passConfirm").value;

    // VALIDACIONES
    if (generoNuevo !== originalGenero) {
      await actualizarGenero(generoNuevo);
    }

    if (actual || nueva || confirmada) {
      if (!actual || !nueva || !confirmada) {
        return Swal.fire("Campos incompletos", "Debes llenar todas las contraseñas", "warning");
      }
      if (nueva !== confirmada) {
        return Swal.fire("Error", "La nueva contraseña no coincide con la confirmación", "error");
      }
      await cambiarContraseña(actual, nueva);
    }
  };

  const actualizarGenero = async (nuevoGenero) => {
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
          generoId: nuevoGenero === "Hombre" ? 1 : nuevoGenero === "Mujer" ? 2 : 3,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const encrypted = Cookies.get("IFUser_Info");
        const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
        const userData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        const updatedData = { ...userData, genero: nuevoGenero };
        Cookies.set("IFUser_Info", CryptoJS.AES.encrypt(JSON.stringify(updatedData), secretKey).toString(), { expires: 7 });
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

  const cambiarContraseña = async (actual, nueva) => {
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
  title: `
    <div style="margin-bottom: 10px; font-size: 1.4rem">Editar Perfil</div>
    <hr style="margin: 0; border: 1px solid #ddd;" />
  `,
  width: '800px', // ← AUMENTA EL ANCHO DEL MODAL
  html: `
    <style>
    .edit-container_Profile {
      display: flex;
      gap: 30px;
      margin-top: 20px;
    }
    .section_Profile {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }
    .section-title_Profile {
      font-weight: bold;
      margin-bottom: 15px;
      font-size: 1.15rem;
      text-align: center;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 5px;
    }
    .swal2-input-custom_Profile {
      width: 100%;
      padding: 8px;
      margin-top: 5px;
      margin-bottom: 15px;
      border-radius: 5px;
      border: 1px solid #ccc;
    }
    .password-row_Profile {
      display: flex;
      gap: 10px;
    }
    .swal2-eye_Profile {
      position: absolute;
      top: 50%;
      right: 10px;
      transform: translateY(-50%);
      cursor: pointer;
      font-size: 1rem;
      color: #555;
    }
    .swal2-password-container_Profile {
      position: relative;
      flex: 1;
    }
    .divider_Profile {
      width: 1px;
      background-color: #ccc;
      margin: 0 10px;
    }
    .btn-final_Profile {
      width: 100%;
      padding: 12px;
      background: #2a40bf;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: bold;
      margin-top: 25px;
    }
  </style>

  <div class="edit-container_Profile">
    <div class="section_Profile">
      <div class="section-title_Profile">Actualizar Género</div>
      <label>Seleccionar Género:</label>
      <select id="generoSelect" class="swal2-input-custom_Profile">
        <option value="Hombre" ${genero === "Hombre" ? "selected" : ""}>Hombre</option>
        <option value="Mujer" ${genero === "Mujer" ? "selected" : ""}>Mujer</option>
        <option value="Indefinido" ${genero === "Indefinido" ? "selected" : ""}>Indefinido</option>
      </select>
    </div>

    <div class="divider_Profile"></div>

    <div class="section_Profile">
      <div class="section-title_Profile">Actualizar Contraseña</div>
      <label>Contraseña actual:</label>
      <div class="swal2-password-container_Profile">
        <input id="passActual" type="password" class="swal2-input-custom_Profile" />
        <i class="fa fa-eye swal2-eye_Profile" id="eyeActual"></i>
      </div>

      <div class="password-row_Profile">
        <div class="swal2-password-container_Profile">
          <label>Nueva:</label>
          <input id="passNueva" type="password" class="swal2-input-custom_Profile" />
          <i class="fa fa-eye swal2-eye_Profile" id="eyeNueva"></i>
        </div>
        <div class="swal2-password-container_Profile">
          <label>Confirmar:</label>
          <input id="passConfirm" type="password" class="swal2-input-custom_Profile" />
          <i class="fa fa-eye swal2-eye_Profile" id="eyeConfirm"></i>
        </div>
      </div>
    </div>
  </div>

  <button id="btnFinal" class="btn-final_Profile">Guardar Cambios</button>
  `,
  showConfirmButton: false,
  showCloseButton: true,
  willClose: () => {
    if (setShowModal) setShowModal(false);
  },
  didOpen: () => {
    // Toggle visibilidad
    ["Actual", "Nueva", "Confirm"].forEach((campo) => {
      const input = document.getElementById(`pass${campo}`);
      const eye = document.getElementById(`eye${campo}`);
      eye.addEventListener("click", () => {
        input.type = input.type === "password" ? "text" : "password";
        eye.classList.toggle("fa-eye");
        eye.classList.toggle("fa-eye-slash");
      });
    });

    document.getElementById("btnFinal").addEventListener("click", () => {
      actualizarTodo();
    });
  },
});

  };

  return null;
};

export default EditarPerfil;
