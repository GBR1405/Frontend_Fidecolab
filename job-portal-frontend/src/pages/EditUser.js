import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import CryptoJS from "crypto-js";

const MySwal = withReactContent(Swal);
const apiUrl = process.env.REACT_APP_API_URL;
const secretKey = process.env.REACT_APP_SECRET_KEY;

const EditarPerfil = ({ setShowModal }) => {
  const [correo, setCorreo] = useState("");
  const [genero, setGenero] = useState("Indefinido");
  const [originalGenero, setOriginalGenero] = useState("Indefinido");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    const encrypted = Cookies.get("IFUser_Info");
    if (!encrypted) return;

    const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
    const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    setCorreo(decrypted.correo);
    setGenero(decrypted.genero || "Indefinido");
    setOriginalGenero(decrypted.genero || "Indefinido");
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          correo,
          generoId: genero === "Hombre" ? 1 : genero === "Mujer" ? 2 : 3
        })
      });

      const data = await res.json();

      if (data.success) {
        const encrypted = Cookies.get("IFUser_Info");
        const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
        const userData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        const updatedData = { ...userData, genero };

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

  const cambiarContraseña = async () => {
    if (!currentPassword || !newPassword) {
      return Swal.fire("Campos incompletos", "Debes llenar ambas contraseñas", "warning");
    }

    try {
      const token = Cookies.get("authToken");

      const res = await fetch(`${apiUrl}/auth/user-update-password`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (data.success) {
        Swal.fire("¡Listo!", "Contraseña actualizada correctamente", "success").then(() => {
          setCurrentPassword("");
          setNewPassword("");
        });
      } else {
        Swal.fire("Error", data.message || "No se pudo actualizar la contraseña", "error");
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Error inesperado al cambiar la contraseña", "error");
    }
  };

  // SweetAlert personalizado
  MySwal.fire({
    title: "Editar Perfil",
    html: (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", textAlign: "left" }}>
        {/* Columna 1: Género */}
        <div>
          <label style={{ fontWeight: "bold" }}>Correo:</label>
          <input value={correo} disabled style={inputStyle} />

          <label style={{ fontWeight: "bold", marginTop: "10px" }}>Género:</label>
          <select value={genero} onChange={(e) => setGenero(e.target.value)} style={inputStyle}>
            <option value="Hombre">Hombre</option>
            <option value="Mujer">Mujer</option>
            <option value="Indefinido">Indefinido</option>
          </select>

          <button onClick={actualizarGenero} style={buttonStyle}>Actualizar Género</button>
        </div>

        {/* Columna 2: Contraseña */}
        <div>
          <label style={{ fontWeight: "bold" }}>Contraseña actual:</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={inputStyle}
          />

          <label style={{ fontWeight: "bold", marginTop: "10px" }}>Nueva contraseña:</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={inputStyle}
          />

          <button onClick={cambiarContraseña} style={{ ...buttonStyle, background: "#198754" }}>
            Cambiar Contraseña
          </button>
        </div>
      </div>
    ),
    showConfirmButton: false,
    showCloseButton: true,
    willClose: () => {
      if (setShowModal) setShowModal(false);
    }
  });

  return null;
};

// Estilos comunes
const inputStyle = {
  width: "100%",
  padding: "8px",
  marginTop: "5px",
  marginBottom: "15px",
  borderRadius: "5px",
  border: "1px solid #ccc"
};

const buttonStyle = {
  width: "100%",
  padding: "10px",
  background: "#0d6efd",
  color: "white",
  border: "none",
  borderRadius: "5px",
  fontWeight: "bold",
  cursor: "pointer"
};

export default EditarPerfil;
