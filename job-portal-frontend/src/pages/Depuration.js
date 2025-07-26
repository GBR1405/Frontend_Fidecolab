import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import "../styles/adminComponents.css";
import LayoutAdmin from "../components/LayoutAdmin";

const Depuration = () => {
  const [selectedTab, setSelectedTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [systemCleanCode, setSystemCleanCode] = useState('');
  const [showSystemClean, setShowSystemClean] = useState(false);

  // Calcular índices para la paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Datos de ejemplo para usuarios
  const getUsersData = async () => {
    const usersDataArray = [];
    
    for (let i = 1; i <= 30; i++) {
      const role = i % 3 === 0 ? 'Profesor' : 'Estudiante';
      const status = i % 4 === 0 ? 'Inactivo' : 'Activo';
      
      usersDataArray.push({
        id: i,
        nombre: `Usuario ${i}`,
        primerApellido: `Apellido1 ${i}`,
        segundoApellido: `Apellido2 ${i}`,
        cursosVinculados: i % 2 === 0 ? `${i} cursos` : 'Ninguno',
        rol: role,
        estado: status,
        genero: i % 2 === 0 ? 'Masculino' : 'Femenino'
      });
    }
    
    setData(usersDataArray);
  }

  // Datos de ejemplo para historial
  const getHistoryData = async () => {
    const historyDataArray = [];
    
    for (let i = 1; i <= 15; i++) {
      historyDataArray.push({
        id: i,
        fecha: `2023-11-${i < 10 ? '0'+i : i}`,
        curso: `Curso ${i}`,
        profesor: `Profesor ${i}`,
      });
    }
    
    setData(historyDataArray);
  }

  // Datos de ejemplo para logs
  const getLogsData = async () => {
    const logsDataArray = [];
    
    for (let i = 1; i <= 20; i++) {
      logsDataArray.push({
        id: i,
        fecha: `2023-11-${i < 10 ? '0'+i : i} ${i%24}:${i%60}`,
        accion: i % 3 === 0 ? 'Creación' : i % 3 === 1 ? 'Actualización' : 'Eliminación',
        error: i % 5 === 0 ? `Error ${i}` : 'Ninguno',
        usuario: `Usuario ${i}`
      });
    }
    
    setData(logsDataArray);
  }

  // Cargar datos según la pestaña seleccionada
  useEffect(() => {
    if (selectedTab === 'users') {
      getUsersData();
    } else if (selectedTab === 'history') {
      getHistoryData();
    } else if (selectedTab === 'logs') {
      getLogsData();
    }
  }, [selectedTab]);

  // Cambiar página
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleRoleFilterChange = (event) => {
    setRoleFilter(event.target.value);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  // Función para desvincular usuarios
  const handleUnlinkUsers = () => {
    Swal.fire({
      title: 'Desvincular Usuarios',
      text: 'Seleccione qué usuarios desea desvincular',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Desvincular todos los profesores',
      cancelButtonText: 'Desvincular todos los estudiantes',
      showDenyButton: true,
      denyButtonText: 'Desvincular todos los usuarios',
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Éxito', 'Todos los profesores han sido desvinculados', 'success');
      } else if (result.isDenied) {
        Swal.fire({
          title: '¡PELIGRO!',
          text: 'Esta acción desvinculará TODOS los usuarios y no se puede deshacer',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Confirmar',
          cancelButtonText: 'Cancelar',
          timer: 15000,
          timerProgressBar: true,
        }).then((result) => {
          if (result.isConfirmed) {
            Swal.fire('Éxito', 'Todos los usuarios han sido desvinculados', 'success');
          }
        });
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire('Éxito', 'Todos los estudiantes han sido desvinculados', 'success');
      }
    });
  };

  // Función para agregar usuario
  const handleAddUser = () => {
    Swal.fire({
      title: 'Agregar Nuevo Usuario',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Nombre">' +
        '<input id="swal-input2" class="swal2-input" placeholder="Primer Apellido">' +
        '<input id="swal-input3" class="swal2-input" placeholder="Segundo Apellido">' +
        '<select id="swal-input4" class="swal2-input">' +
          '<option value="">Seleccione Género</option>' +
          '<option value="Masculino">Masculino</option>' +
          '<option value="Femenino">Femenino</option>' +
          '<option value="Otro">Otro</option>' +
        '</select>' +
        '<select id="swal-input5" class="swal2-input">' +
          '<option value="">Seleccione Rol</option>' +
          '<option value="Profesor">Profesor</option>' +
          '<option value="Estudiante">Estudiante</option>' +
        '</select>',
      focusConfirm: false,
      preConfirm: () => {
        return [
          document.getElementById('swal-input1').value,
          document.getElementById('swal-input2').value,
          document.getElementById('swal-input3').value,
          document.getElementById('swal-input4').value,
          document.getElementById('swal-input5').value
        ]
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Éxito', 'Usuario agregado correctamente', 'success');
      }
    });
  };

  // Función para eliminar elemento
  const handleDeleteItem = (itemType, id) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Esta acción eliminará el ${itemType} seleccionado`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Eliminado', `El ${itemType} ha sido eliminado`, 'success');
      }
    });
  };

  // Función para limpieza del sistema
  const handleSystemClean = (action) => {
    let title, text;
    
    switch(action) {
      case 'customizations':
        title = 'Limpiar personalizaciones';
        text = '¿Estás seguro que deseas eliminar todas las personalizaciones del sistema?';
        break;
      case 'logs':
        title = 'Limpiar bitácora';
        text = '¿Estás seguro que deseas eliminar todos los registros de la bitácora?';
        break;
      case 'history':
        title = 'Limpiar historial';
        text = '¿Estás seguro que deseas eliminar todo el historial del sistema?';
        break;
      case 'students':
        title = 'Eliminar todos los estudiantes';
        text = '¿Estás seguro que deseas eliminar todos los estudiantes del sistema?';
        break;
      case 'professors':
        title = 'Eliminar todos los profesores';
        text = '¿Estás seguro que deseas eliminar todos los profesores del sistema?';
        break;
      case 'reset':
        title = 'PELIGRO - REINICIAR SISTEMA';
        text = 'Esta acción eliminará TODOS los datos del sistema (excepto administradores) y NO SE PUEDE DESHACER. ¿Estás absolutamente seguro?';
        break;
      default:
        return;
    }

    if (action === 'reset') {
      Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        input: 'text',
        inputPlaceholder: 'Ingresa "fidecolab" para confirmar',
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d33',
        preConfirm: (input) => {
          if (input.toLowerCase() !== 'fidecolab') {
            Swal.showValidationMessage('Código incorrecto');
          }
        }
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire('Sistema Reiniciado', 'El sistema ha sido reiniciado completamente', 'success');
        }
      });
    } else {
      Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire('Completado', `La acción "${title}" se ha realizado con éxito`, 'success');
        }
      });
    }
  };

  // Función para ver detalles de usuario
  const viewUserDetails = (user) => {
    Swal.fire({
      title: `Detalles de ${user.nombre}`,
      html: `
        <div style="text-align: left;">
          <p><strong>Nombre completo:</strong> ${user.nombre} ${user.primerApellido} ${user.segundoApellido}</p>
          <p><strong>Género:</strong> ${user.genero}</p>
          <p><strong>Rol:</strong> ${user.rol}</p>
          <p><strong>Estado:</strong> ${user.estado}</p>
          <p><strong>Cursos vinculados:</strong> ${user.cursosVinculados}</p>
        </div>
      `,
      confirmButtonText: 'Cerrar'
    });
  };

  // Función para cambiar estado de usuario
  const toggleUserStatus = (user) => {
    const newStatus = user.estado === 'Activo' ? 'Inactivo' : 'Activo';
    Swal.fire({
      title: 'Cambiar estado',
      text: `¿Estás seguro que deseas cambiar el estado de ${user.nombre} a ${newStatus}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Estado actualizado', `El estado de ${user.nombre} ha sido cambiado a ${newStatus}`, 'success');
      }
    });
  };

  // Función para editar usuario
  const editUser = (user) => {
    Swal.fire({
      title: `Editar ${user.nombre}`,
      html:
        `<input id="swal-input1" class="swal2-input" placeholder="Nombre" value="${user.nombre}">` +
        `<input id="swal-input2" class="swal2-input" placeholder="Primer Apellido" value="${user.primerApellido}">` +
        `<input id="swal-input3" class="swal2-input" placeholder="Segundo Apellido" value="${user.segundoApellido}">` +
        `<select id="swal-input4" class="swal2-input">` +
          `<option value="Masculino" ${user.genero === 'Masculino' ? 'selected' : ''}>Masculino</option>` +
          `<option value="Femenino" ${user.genero === 'Femenino' ? 'selected' : ''}>Femenino</option>` +
          `<option value="Otro" ${user.genero === 'Otro' ? 'selected' : ''}>Otro</option>` +
        `</select>` +
        `<select id="swal-input5" class="swal2-input">` +
          `<option value="Profesor" ${user.rol === 'Profesor' ? 'selected' : ''}>Profesor</option>` +
          `<option value="Estudiante" ${user.rol === 'Estudiante' ? 'selected' : ''}>Estudiante</option>` +
        `</select>` +
        `<select id="swal-input6" class="swal2-input">` +
          `<option value="Activo" ${user.estado === 'Activo' ? 'selected' : ''}>Activo</option>` +
          `<option value="Inactivo" ${user.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>` +
        `</select>`,
      focusConfirm: false,
      preConfirm: () => {
        return [
          document.getElementById('swal-input1').value,
          document.getElementById('swal-input2').value,
          document.getElementById('swal-input3').value,
          document.getElementById('swal-input4').value,
          document.getElementById('swal-input5').value,
          document.getElementById('swal-input6').value
        ]
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Éxito', 'Usuario actualizado correctamente', 'success');
      }
    });
  };

  // Función para acceder a la limpieza del sistema
  const accessSystemClean = () => {
    Swal.fire({
      title: 'Acceso a Limpieza del Sistema',
      text: 'Ingrese el código de seguridad para continuar',
      input: 'text',
      inputPlaceholder: 'Código',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      preConfirm: (input) => {
        if (input.toLowerCase() !== 'fidecolab') {
          Swal.showValidationMessage('Código incorrecto');
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setShowSystemClean(true);
      }
    });
  };

  // Si estamos en modo limpieza del sistema, mostrar esa interfaz
  if (showSystemClean) {
    return (
      <LayoutAdmin>
        <section className="depuration__container">
          <div className="depuration__title">
            <h3>Limpieza del Sistema</h3>
          </div>          
          <div className="system-clean__container">
            <div className="system-clean__warning">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <p>ADVERTENCIA: Las acciones en esta sección son IRREVERSIBLES. Proceda con extrema precaución.</p>
            </div>            
            <div className="system-clean__buttons">
              <button 
                className="clean-button clean-button--customizations"
                onClick={() => handleSystemClean('customizations')}
              >
                <i className="fa-solid fa-paint-roller"></i>
                Limpiar todas las personalizaciones
              </button>              
              <button 
                className="clean-button clean-button--logs"
                onClick={() => handleSystemClean('logs')}
              >
                <i className="fa-solid fa-clipboard-list"></i>
                Limpiar la Bitácora
              </button>              
              <button 
                className="clean-button clean-button--history"
                onClick={() => handleSystemClean('history')}
              >
                <i className="fa-solid fa-clock-rotate-left"></i>
                Limpiar Historial
              </button>              
              <button 
                className="clean-button clean-button--students"
                onClick={() => handleSystemClean('students')}
              >
                <i className="fa-solid fa-user-graduate"></i>
                Eliminar todos los Estudiantes
              </button>              
              <button 
                className="clean-button clean-button--professors"
                onClick={() => handleSystemClean('professors')}
              >
                <i className="fa-solid fa-user-tie"></i>
                Eliminar todos los Profesores
              </button>
            </div>
            
              <button 
                className="reset-button"
                onClick={() => handleSystemClean('reset')}
              >
                <i className="fa-solid fa-bomb"></i>
                REINICIAR SISTEMA FIDECOLAB
              </button>
          </div>
          <button 
            className="button__back"
            onClick={() => setShowSystemClean(false)}
          >
            Regresar
          </button>
        </section>
      </LayoutAdmin>
    );
  }

  return (
    <LayoutAdmin>
      <section className="depuration__container">
        <div className="depuration__title">
          <h3>Depuración</h3>
        </div>
        <div className="depuration__content">
          {/* Left Sidebar */}
          <div className="depuration__left">
            <div 
              className={`left__box ${selectedTab === 'users' ? 'active' : ''}`} 
              onClick={() => handleTabChange('users')}
            >
              <div className="box__shape shape--users">
                <i className="fa-solid fa-users"></i>
              </div>
              <div className="right__text">
                <p className="text__title">Administrar Usuarios</p>
                <p className="text__description">Gestiona todos los usuarios del sistema (profesores y estudiantes), su edición, eliminación y revisión de actividad</p>
              </div>
            </div>
            
            <div 
              className={`left__box ${selectedTab === 'history' ? 'active' : ''}`} 
              onClick={() => handleTabChange('history')}
            >
              <div className="box__shape shape--history">
                <i className="fa-solid fa-clock-rotate-left"></i>
              </div>
              <div className="right__text">
                <p className="text__title">Administrar Historial</p>
                <p className="text__description">Desde acá se administrará todo el historial de cada partida al igual que la opción de una limpieza total o parcial.</p>
              </div>
            </div>
            
            <div 
              className={`left__box ${selectedTab === 'logs' ? 'active' : ''}`} 
              onClick={() => handleTabChange('logs')}
            >
              <div className="box__shape shape--log">
                <i className="fa-solid fa-clipboard-list"></i>
              </div>
              <div className="right__text">
                <p className="text__title">Administrar Logs</p>
                <p className="text__description">Registros detallados de todas las acciones del sistema, incluyendo errores y actividad de usuarios.</p>
              </div>
            </div>
            
            <div 
              className="left__box left__box--danger"
              onClick={accessSystemClean}
            >
              <div className="box__shape shape--danger">
                <i className="fa-solid fa-broom"></i>
              </div>
              <div className="right__text">
                <p className="text__title">Limpieza del Sistema</p>
                <p className="text__description">Acciones avanzadas de mantenimiento y limpieza del sistema. Requiere código de seguridad.</p>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="depuration__right">
            {/* Options */}
            <div className="depuration__top">
              <div className="depuration__options">
                <div className="options__top">
                  <div className="depuration__title">
                    <h3>
                      {selectedTab === 'users' && 'Administrar Usuarios'}
                      {selectedTab === 'history' && 'Administrar Historial'}
                      {selectedTab === 'logs' && 'Administrar Logs'}
                    </h3>
                  </div>
                  
                  {/* Acciones según el tab */}
                  {selectedTab === 'users' && (
                    <>
                      <div className="option__button button--unlink">
                        <button type="button" onClick={handleUnlinkUsers}>
                          Desvincular usuario
                        </button>
                      </div>
                      <div className="option__button button--add">
                        <button type="button" onClick={handleAddUser}>
                          Agregar Usuario
                        </button>
                      </div>
                    </>
                  )}
                  
                  {(selectedTab === 'history' || selectedTab === 'logs') && (
                    <div className="option__button button--delete-all">
                      <button 
                        type="button" 
                        onClick={() => handleDeleteItem(
                          selectedTab === 'history' ? 'historial' : 'log', 
                          'all'
                        )}
                      >
                        Eliminar todo
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="options__bottom">
                  <div className="option__search">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input 
                      type="search" 
                      placeholder="Buscar elemento"
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                  </div> 
                  <div className="option__button button--search">
                    <button type="button">Buscar</button>
                  </div>                 
                  {selectedTab === 'users' && (
                    <>
                      <div className="option__filter">
                        <select 
                          value={roleFilter}
                          onChange={handleRoleFilterChange}
                        >
                          <option value="all">Todos los roles</option>
                          <option value="Profesor">Profesores</option>
                          <option value="Estudiante">Estudiantes</option>
                        </select>
                      </div>                      
                      <div className="option__filter">
                        <select 
                          value={statusFilter}
                          onChange={handleStatusFilterChange}
                        >
                          <option value="all">Todos los estados</option>
                          <option value="Activo">Activos</option>
                          <option value="Inactivo">Inactivos</option>
                        </select>
                      </div>                      
                    </>
                  )}
                  
                  
                </div>
              </div>
            </div>

            {/* List to Depurate */}
            <div className="depuration__bottom">
              {selectedTab === 'users' ? (
                <>
                  <div className="bottom__title">
                    <h3>Lista de Usuarios</h3>
                  </div>
                  <table className="bottom__table">
                    <thead className="table__head">
                      <th className="table__header">Nombre</th>
                      <th className="table__header">Apellidos</th>
                      <th className="table__header">Cursos</th>
                      <th className="table__header">Rol</th>
                      <th className="table__header">Estado</th>
                      <th className="table__header">Acciones</th>
                    </thead>
                    <tbody className="table__body">
                      {currentItems.map((item, index) => (
                        <tr className="table__row" key={index}>
                          <td className="table__data">{item.nombre}</td>
                          <td className="table__data">{item.primerApellido} {item.segundoApellido}</td>
                          <td className="table__data">{item.cursosVinculados}</td>
                          <td className="table__data">{item.rol}</td>
                          <td className="table__data">{item.estado}</td>
                          <td className="table__data table__data--actions">
                            <button 
                              className="button__edit"
                              onClick={() => editUser(item)}
                              title="Editar"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button 
                              className={`button__ban ${item.estado === 'Inactivo' ? 'inactive' : ''}`}
                              onClick={() => toggleUserStatus(item)}
                              title={item.estado === 'Activo' ? 'Desactivar' : 'Activar'}
                            >
                              <i className="fa-solid fa-ban"></i>
                            </button>
                            <button 
                              className="button__delete"
                              onClick={() => handleDeleteItem('usuario', item.id)}
                              title="Eliminar"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                            <button 
                              className="button__view"
                              onClick={() => viewUserDetails(item)}
                              title="Ver detalles"
                            >
                              <i className="fa-solid fa-eye"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table__foot">
                      {totalPages > 1 && (
                        <div className="foot__buttons">                            
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(number => {
                              let pageNumber;
                              if (currentPage === 1 || currentPage === 2) {
                                pageNumber = currentPage === 1 ? number <= 5 : number >= currentPage - 1 && number <= currentPage + 3;
                              }
                              if (currentPage > 2 && currentPage < totalPages - 1) {
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
                </>
              ) : selectedTab === 'history' ? (
                <>
                  <div className="bottom__title">
                    <h3>Historial de partidas</h3>
                  </div>
                  <table className="bottom__table">
                    <thead className="table__head">
                      <tr>
                        <th className="table__header">Fecha</th>
                        <th className="table__header">Curso</th>
                        <th className="table__header">Profesor</th>
                        <th className="table__header">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="table__body">
                      {currentItems.map((item, index) => (
                        <tr className="table__row" key={index}>
                          <td className="table__data">{item.fecha}</td>
                          <td className="table__data">{item.curso}</td>
                          <td className="table__data">{item.profesor}</td>
                          <td className="table__data table__data--actions">
                            <button 
                              className="button__delete"
                              onClick={() => handleDeleteItem('historial', item.id)}
                              title="Eliminar"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table__foot">
                      {totalPages > 1 && (
                        <tr>
                          <td colSpan="4">
                            <div className="foot__buttons">                            
                              {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(number => {
                                  let pageNumber;
                                  if (currentPage === 1 || currentPage === 2) {
                                    pageNumber = currentPage === 1 ? number <= 5 : number >= currentPage - 1 && number <= currentPage + 3;
                                  }
                                  if (currentPage > 2 && currentPage < totalPages - 1) {
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
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </>
              ) : selectedTab === 'logs' ? (
                <>
                  <div className="bottom__title">
                    <h3>Bitácora de Acciones</h3>
                  </div>
                  <table className="bottom__table">
                    <thead className="table__head">
                      <tr>
                        <th className="table__header">Fecha</th>
                        <th className="table__header">Acción</th>
                        <th className="table__header">Error</th>
                        <th className="table__header">Usuario</th>
                        <th className="table__header">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="table__body">
                      {currentItems.map((item, index) => (
                        <tr className="table__row" key={index}>
                          <td className="table__data">{item.fecha}</td>
                          <td className="table__data">{item.accion}</td>
                          <td className="table__data">{item.error}</td>
                          <td className="table__data">{item.usuario}</td>
                          <td className="table__data table__data--actions">
                            <button 
                              className="button__delete"
                              onClick={() => handleDeleteItem('log', item.id)}
                              title="Eliminar"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table__foot">
                      {totalPages > 1 && (
                        <tr>
                          <td colSpan="5">
                            <div className="foot__buttons">                            
                              {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(number => {
                                  let pageNumber;
                                  if (currentPage === 1 || currentPage === 2) {
                                    pageNumber = currentPage === 1 ? number <= 5 : number >= currentPage - 1 && number <= currentPage + 3;
                                  }
                                  if (currentPage > 2 && currentPage < totalPages - 1) {
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
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </>
              ) : (
                <div className="depuration__empty">
                  <i className="fa-solid fa-folder-open"></i>
                  <p>Selecciona un módulo para administrar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </LayoutAdmin>
  );
};

export default Depuration;