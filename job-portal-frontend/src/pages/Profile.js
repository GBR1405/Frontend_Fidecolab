import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import "../styles/profile.css";
import "../styles/historyComponents.css";
import Cookies from "js-cookie";
import EditUser from "./EditUser";
import CryptoJS from "crypto-js";
import Swal from 'sweetalert2';

const secretKey = process.env.REACT_APP_SECRET_KEY;
const apiUrl = process.env.REACT_APP_API_URL;
const token = Cookies.get("authToken");

function Profile() {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    const encryptedUserInfo = Cookies.get("IFUser_Info");

    if (encryptedUserInfo) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedUserInfo, secretKey);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        setUser(decryptedData);

        const response = await fetch(`${apiUrl}/getFullUserGames`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log("DATA DEL BACKEND", data);
          setProfileData(data);
        } else {
          console.error("Error al obtener datos del backend");
        }

      } catch (err) {
        console.error("Error al desencriptar o procesar usuario:", err);
        setError("Error al procesar información del usuario.");
      }
    } else {
      setError("Debes iniciar sesión para ver tu perfil.");
    }
  };

  const formatCurso = (rawString) => {
    if (!rawString) return "Ningún curso asignado";
    return rawString
      .split(',')
      .map(c => c.trim().substring(0, 6))
      .filter(c => c)
      .join(', ');
  };

  const currentItems = profileData?.ultimasPartidas?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) || [];
  const totalPages = Math.ceil((profileData?.ultimasPartidas?.length || 0) / itemsPerPage);

  if (error) {
    return (
      <Layout>
        <section className="main__container">
          <h2 className="error-text">{error}</h2>
        </section>
      </Layout>
    );
  }

  if (!user || !profileData) {
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
                  <h3>{profileData?.totalSimulaciones || 0}</h3>
                  <span>Simulaciones realizadas</span>
                </div>
              </div>
              {user.rol !== "Profesor" && (
                <div className="stats__group_PF">
                  <div className="stats__icon_PF">
                    <i className="fa-solid fa-circle-check"></i>
                  </div>
                  <div className="stats__text_PF">
                    <h3>{profileData?.logros?.length || 0}</h3>
                    <span>Logros</span>
                  </div>
                </div>
              )}
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
              <input className="info__input_PF" type="text" value={formatCurso(profileData?.cursoActual)} readOnly />
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
            <a className="bottom__text_PF" href="/ver-historial">
              Ver historial completo
            </a>
          </div>
          <div className="historial__view_H">
            {currentItems.length === 0 ? (
              <span className="bottom__text_PF">¡Todavía no has hecho una simulación!</span>
            ) : (
              <table className="left__table_H">
                <thead className="table__head_H">
                  <tr>
                    <th className="table__header_H">Fecha</th>
                    <th className="table__header_H">Curso</th>
                    <th className="table__header_H">Equipo</th>
                    <th className="table__header_H">Acción</th>
                  </tr>
                </thead>
                <tbody className="table__body_H">
                  {currentItems.map((item, idx) => (
                    <tr className="table__row_H" key={idx}>
                      <td className="table__data_H">{item.fecha}</td>
                      <td className="table__data_H">{item.curso?.substring(0, 6)}</td>
                      <td className="table__data_H">{item.equipo}</td>
                      <td className="table__data_H">{item.accion}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table__foot_H">
                  {totalPages > 1 && (
                    <div className="foot__buttons_H">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                        <button
                          key={number}
                          className={`button__page_H ${currentPage === number ? "active" : ""}`}
                          onClick={() => setCurrentPage(number)}
                        >
                          {number}
                        </button>
                      ))}
                    </div>
                  )}
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </section>

      {showModal && <EditUser setShowModal={setShowModal} />}
    </Layout>
  );
}

export default Profile;
