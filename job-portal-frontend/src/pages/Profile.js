import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import "../styles/profile.css";
import Cookies from "js-cookie";
import EditUser from "./EditUser";
import CryptoJS from "crypto-js";
import Swal from 'sweetalert2';

const secretKey = process.env.REACT_APP_SECRET_KEY;

function Profile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false); 

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = () => {
    const encryptedUserInfo = Cookies.get("IFUser_Info");
  if (encryptedUserInfo) {
    // Desencriptar la información
    const bytes = CryptoJS.AES.decrypt(encryptedUserInfo, secretKey);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    setUser(decryptedData);
  } else {
    setError("Debes iniciar sesión para ver tu perfil.");
  }
  };

  if (error) {
    return (
      <Layout>
        <section className="main__container">
          <h2 className="error-text">{error}</h2>
        </section>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <section className="main__container">
          <div className="loader"></div>
          <p className="loading-text">Cargando datos del usuario...</p>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="main__container_PF">
        <div className="container__top_PF">
          <div className="top__image_PF">
            <img
              className="image__user_PF"
              src={`https://api.dicebear.com/7.x/identicon/svg?seed=${user.nombre}`}
              alt="User Avatar"
            />
          </div>
          <div className="top__info_PF">
            <div className="info__box_PF">
              <h1 className="info__title_PF">{`${user.nombre} ${user.apellido1} ${user.apellido2}`}</h1>
              <span>{user.rol}</span>
            </div>
            <div className="info__stats_PF">
              <div className="stats__group_PF">
                <div className="stats__icon_PF">
                  <i className="fa-solid fa-flag"></i>
                </div>
                <div className="stats__text_PF">
                  <h3>0</h3>
                  <span>Simulaciones realizadas</span>
                </div>
              </div>
              <div className="stats__group_PF">
                <div className="stats__icon_PF">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <div className="stats__text_PF">
                  <h3>0</h3>
                  <span>Logros</span>
                </div>
              </div>
            </div>
          </div>
          <div className="top__edit_PF">
            <button className="edit__btn_PF" onClick={() => setShowModal(true)}>
              Editar Perfil
            </button>
          </div>
        </div>
        <div className="container__middle_PF">
          <div className="container__heading_PF">
            <h3>Información personal</h3>
          </div>
          <div className="middle__content_PF">
            <div className="content__info_PF">
              <label className="info__label_PF">Nombre completo:</label>
              <input className="info__input_PF" type="text" value={`${user.nombre} ${user.apellido1} ${user.apellido2}`} readOnly />
            </div>
            <div className="content__info_PF">
              <label className="info__label_PF">Curso:</label>
              <input className="info__input_PF" type="text" value={user.groupName || "N/A"} readOnly />
            </div>
            <div className="content__info_PF">
              <label className="info__label_PF">Correo electrónico:</label>
              <input className="info__input_PF" type="text" value={user.correo} readOnly />
            </div>
            <div className="content__info_PF">
              <label className="info__label_PF">Género:</label>
              <input className="info__input_PF" type="text" value={user.genero} readOnly />
            </div>
          </div>
        </div>
        <div className="container__bottom_PF">
          <div className="container__heading_PF">
            <h3>Simulaciones recientes</h3>
            <a className="bottom__text_PF" href="/">
              Ver historial completo
            </a>
          </div>
          <div className="bottom__content_PF">
            <span className="bottom__text_PF">¡Todavía no has hecho una simulación!</span>
          </div>
        </div>
      </section>

      {/* Aquí se renderiza el modal de edición cuando showModal es true */}
      {showModal && <EditUser setShowModal={setShowModal} />}
    </Layout>
  );
}

export default Profile;
