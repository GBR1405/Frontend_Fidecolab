import React, { useState, useEffect } from 'react';
import "../styles/historyComponents.css";
import Layout from "../components/Layout";

const StudentHistory = () => {
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5); 

    const History = [
      { id: 1, nombre: "Historial 1" },
      { id: 1, nombre: "Historial 1" },
      { id: 1, nombre: "Historial 1" },
      { id: 1, nombre: "Historial 1" },
      { id: 1, nombre: "Historial 1" },
      { id: 2, nombre: "Historial 2" },
      { id: 2, nombre: "Historial 2" },
      { id: 2, nombre: "Historial 2" },
      { id: 2, nombre: "Historial 2" },
      { id: 2, nombre: "Historial 2" }
    ];

    // Calcular índices para la paginación
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = History.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(History.length / itemsPerPage);

    // Cambiar página
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
      <>
        <Layout>
          <section className="student__container">
              <div className="historial__title">
            <h3>Historial</h3>
              </div>
              <div className="historial__view">
                  <div className="left__title">
                      <h3>Historial de Partidas</h3>
                  </div>
                  {loading ? (
                      <span>Cargando historial de descargas...</span>
                  ) : History.length === 0 ? (
                      <span>Por ahora no has descargado reportes</span>
                  ) : (                  
                    <table className="left__table">
                      <thead className="table__head">
                        <th className="table__header">ID</th>
                        <th className="table__header">Nombre</th>
                      </thead>
                      <tbody className="table__body">
                          {currentItems.map((item, index) => (
                              <tr className="table__row" key={index}>
                                  <td className="table__data">{item.id}</td>
                                  <td className="table__data">{item.nombre}</td>
                              </tr>
                          ))}
                      </tbody>
                      <tfoot className="table__foot">
                        {/* Paginación centrada debajo de la tabla */}
                        {totalPages > 1 && (
                            <div className="foot__buttons">                            
                                {/* Mostrar páginas alrededor de la página actual */}
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(number => {
                                      let pageNumber;
                                      if (currentPage === 1 || currentPage === 2) {
                                        pageNumber = currentPage === 1? number <= 5 : number >= currentPage - 1 && number <= currentPage + 3;
                                      }
                                      if (currentPage > 2 && currentPage < totalPages -1) {
                                        pageNumber = number >= currentPage - 2 && number <= currentPage + 2 && number > 0 && number <= totalPages;
                                      }  
                                      if (currentPage === totalPages - 1 || currentPage === totalPages) {
                                        pageNumber = currentPage === totalPages ? number >= currentPage - 4 : number >= currentPage - 3 && number <= currentPage + 1;
                                      }                                                 
                                      return pageNumber;                            
                                    })
                                    .map(number => (
                                        <button 
                                            className={`button__page ${currentPage === number ? "active" : ""}`}
                                            key={number}
                                            onClick={() => paginate(number)}
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
          </section>
        </Layout>
      </>
    );
};

export default StudentHistory;
