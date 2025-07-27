import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import "../styles/adminComponents.css";
import LayoutAdmin from "../components/LayoutAdmin";
import Cookies from 'js-cookie';

const Depuration = () => {
  const token = Cookies.get("authToken");
  const [selectedTab, setSelectedTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [showSystemClean, setShowSystemClean] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Fetch users from API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/usuarios_D`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener usuarios');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      Swal.fire('Error', 'No se pudieron obtener los usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search and filters
  useEffect(() => {
    let result = users;

    // Filter by role
    if (roleFilter !== 'all') {
      result = result.filter(user => user.Rol === roleFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      const statusValue = statusFilter === 'Activo' ? 1 : 0;
      result = result.filter(user => user.Estado === statusValue);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.Nombre.toLowerCase().includes(query) || 
        user.Apellido1.toLowerCase().includes(query) ||
        user.Apellido2.toLowerCase().includes(query) ||
        user.Correo.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(result);
    setCurrentPage(1);
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Load data when component mounts and when tab changes
  useEffect(() => {
    if (selectedTab === 'users') {
      fetchUsers();
    }
  }, [selectedTab]);

  // Handle add user
  const handleAddUser = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Agregar Nuevo Usuario',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Nombre" required>' +
        '<input id="swal-input2" class="swal2-input" placeholder="Primer Apellido" required>' +
        '<input id="swal-input3" class="swal2-input" placeholder="Segundo Apellido" required>' +
        '<select id="swal-input4" class="swal2-input" required>' +
          '<option value="">Seleccione Rol</option>' +
          '<option value="Profesor">Profesor</option>' +
          '<option value="Estudiante">Estudiante</option>' +
          '<option value="Administrador">Administrador</option>' +
        '</select>' +
        '<select id="swal-input5" class="swal2-input" required>' +
          '<option value="">Seleccione Género</option>' +
          '<option value="1">Masculino</option>' +
          '<option value="2">Femenino</option>' +
          '<option value="3">Otro</option>' +
        '</select>',
      focusConfirm: false,
      preConfirm: () => {
        const nombre = document.getElementById('swal-input1').value;
        const apellido1 = document.getElementById('swal-input2').value;
        const apellido2 = document.getElementById('swal-input3').value;
        const rol = document.getElementById('swal-input4').value;
        const genero = document.getElementById('swal-input5').value;

        if (!nombre || !apellido1 || !apellido2 || !rol || !genero) {
          Swal.showValidationMessage('Todos los campos son obligatorios');
          return false;
        }

        if (rol === 'Administrador') {
          return Swal.fire({
            title: 'Confirmación requerida',
            text: 'Para crear un usuario administrador, ingrese el código de seguridad',
            input: 'text',
            inputPlaceholder: 'Código de seguridad',
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            preConfirm: (code) => {
              if (code !== 'fidecolab') {
                Swal.showValidationMessage('Código incorrecto');
                return false;
              }
              return { nombre, apellido1, apellido2, rol, genero };
            }
          });
        }

        return { nombre, apellido1, apellido2, rol, genero };
      }
    });

    if (!formValues) return;

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/usuarios_D`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre: formValues.nombre,
          apellido1: formValues.apellido1,
          apellido2: formValues.apellido2,
          rol: formValues.rol,
          genero: formValues.genero
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al agregar usuario');
      }

      Swal.fire('Éxito', 'Usuario agregado correctamente', 'success');
      fetchUsers();
    } catch (error) {
      console.error("Error al agregar usuario:", error);
      Swal.fire('Error', error.message || 'No se pudo agregar el usuario', 'error');
    }
  };

  // Handle edit user
  const handleEditUser = async (user) => {
    const { value: formValues } = await Swal.fire({
      title: `Editar Usuario ${user.Nombre}`,
      html:
        `<input id="swal-input1" class="swal2-input" placeholder="Nombre" value="${user.Nombre}" required>` +
        `<input id="swal-input2" class="swal2-input" placeholder="Primer Apellido" value="${user.Apellido1}" required>` +
        `<input id="swal-input3" class="swal2-input" placeholder="Segundo Apellido" value="${user.Apellido2}" required>` +
        `<div style="margin: 10px 0;"><strong>Correo:</strong> ${user.Correo}</div>` +
        `<select id="swal-input4" class="swal2-input" required>` +
          `<option value="Profesor" ${user.Rol === 'Profesor' ? 'selected' : ''}>Profesor</option>` +
          `<option value="Estudiante" ${user.Rol === 'Estudiante' ? 'selected' : ''}>Estudiante</option>` +
          `<option value="Administrador" ${user.Rol === 'Administrador' ? 'selected' : ''}>Administrador</option>` +
        `</select>` +
        `<select id="swal-input5" class="swal2-input" required>` +
          `<option value="1" ${user.Genero === 'Masculino' ? 'selected' : ''}>Masculino</option>` +
          `<option value="2" ${user.Genero === 'Femenino' ? 'selected' : ''}>Femenino</option>` +
          `<option value="3" ${user.Genero === 'Otro' ? 'selected' : ''}>Otro</option>` +
        `</select>`,
      focusConfirm: false,
      preConfirm: () => {
        const nombre = document.getElementById('swal-input1').value;
        const apellido1 = document.getElementById('swal-input2').value;
        const apellido2 = document.getElementById('swal-input3').value;
        const rol = document.getElementById('swal-input4').value;
        const genero = document.getElementById('swal-input5').value;

        if (!nombre || !apellido1 || !apellido2 || !rol || !genero) {
          Swal.showValidationMessage('Todos los campos son obligatorios');
          return false;
        }

        return { nombre, apellido1, apellido2, rol, genero };
      }
    });

    if (!formValues) return;

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/usuarios_D/${user.Usuario_ID_PK}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre: formValues.nombre,
          apellido1: formValues.apellido1,
          apellido2: formValues.apellido2,
          rol: formValues.rol,
          genero: formValues.genero
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar usuario');
      }

      Swal.fire('Éxito', 'Usuario actualizado correctamente', 'success');
      fetchUsers();
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      Swal.fire('Error', error.message || 'No se pudo actualizar el usuario', 'error');
    }
  };

  // Handle restore password
  const handleRestorePassword = async (userId) => {
    const result = await Swal.fire({
      title: '¿Restaurar contraseña?',
      text: 'Se generará una nueva contraseña aleatoria y se enviará al correo del usuario',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/usuarios_D/${userId}/restaurar-contrasena`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al restaurar contraseña');
      }

      Swal.fire('Éxito', 'Contraseña restablecida y correo enviado al usuario', 'success');
    } catch (error) {
      console.error("Error al restaurar contraseña:", error);
      Swal.fire('Error', error.message || 'No se pudo restaurar la contraseña', 'error');
    }
  };

  // Handle toggle user status
  const handleToggleUserStatus = async (user) => {
    const newStatus = user.Estado ? 0 : 1;
    const action = newStatus ? 'activar' : 'desactivar';

    const result = await Swal.fire({
      title: `¿${newStatus ? 'Activar' : 'Desactivar'} usuario?`,
      text: `Estás a punto de ${action} al usuario ${user.Nombre}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      
      // Verifica que el ID sea numérico
      const userId = Number(user.Usuario_ID_PK);
      if (isNaN(userId)) {
        throw new Error('ID de usuario no válido');
      }

      const response = await fetch(`${apiUrl}/usuarios_D/${userId}/desactivar`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
        // Eliminamos el body ya que el estado se manejará en el backend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al ${action} usuario`);
      }

      Swal.fire('Éxito', `Usuario ${action}do correctamente`, 'success');
      fetchUsers();
    } catch (error) {
      console.error(`Error al ${action} usuario:`, error);
      Swal.fire('Error', error.message || `No se pudo ${action} el usuario`, 'error');
    }
  };

  // Handle delete user
  const handleDeleteUser = async (user) => {
    const result = await Swal.fire({
      title: '¿Eliminar usuario?',
      html: `Estás a punto de eliminar permanentemente al usuario <strong>${user.Nombre} ${user.Apellido1}</strong>.<br><br>
            <strong>ADVERTENCIA:</strong> Esta acción eliminará toda la información asociada al usuario y no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar eliminación',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      focusCancel: true
    });

    if (!result.isConfirmed) return;

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/usuarios_D/${user.Usuario_ID_PK}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar usuario');
      }

      Swal.fire('Eliminado', 'El usuario ha sido eliminado correctamente', 'success');
      fetchUsers();
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      Swal.fire('Error', error.message || 'No se pudo eliminar el usuario', 'error');
    }
  };

  // View user details
  const viewUserDetails = async (user) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/usuarios_D/${user.Usuario_ID_PK}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener detalles del usuario');
      }

      const { data: userDetails } = await response.json();

      let detailsContent = `
        <div style="text-align: left; margin-bottom: 20px;">
          <h3>Información Básica</h3>
          <p><strong>Nombre completo:</strong> ${user.Nombre} ${user.Apellido1} ${user.Apellido2}</p>
          <p><strong>Correo:</strong> ${user.Correo}</p>
          <p><strong>Género:</strong> ${user.Genero}</p>
          <p><strong>Rol:</strong> ${user.Rol}</p>
          <p><strong>Estado:</strong> ${user.Estado ? 'Activo' : 'Inactivo'}</p>
      `;

      if (user.Rol === 'Estudiante') {
        detailsContent += `
          <h3 style="margin-top: 20px;">Estadísticas</h3>
          <p><strong>Partidas jugadas:</strong> ${userDetails.totalPartidas || 0}</p>
          <p><strong>Cursos vinculados:</strong> ${userDetails.cursos || 'Ninguno'}</p>
        `;
      } else if (user.Rol === 'Profesor') {
        detailsContent += `
          <h3 style="margin-top: 20px;">Estadísticas</h3>
          <p><strong>Personalizaciones activas:</strong> ${userDetails.totalPersonalizaciones || 0}</p>
          <p><strong>Cursos que imparte:</strong> ${userDetails.cursos || 'Ninguno'}</p>
        `;

        if (userDetails.estudiantes && userDetails.estudiantes.length > 0) {
          detailsContent += `
            <h3 style="margin-top: 20px;">Estudiantes Vinculados</h3>
            <div style="max-height: 200px; overflow-y: auto;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f2f2f2;">
                    <th style="padding: 8px; border: 1px solid #ddd;">Nombre</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Correo</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Curso</th>
                  </tr>
                </thead>
                <tbody>
                  ${userDetails.estudiantes.map(estudiante => `
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd;">${estudiante.Nombre} ${estudiante.Apellido1} ${estudiante.Apellido2}</td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${estudiante.Correo}</td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${estudiante.Nombre_Curso} G${estudiante.Codigo_Grupo}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }
      }

      // Show user logs
      if (userDetails.bitacora && userDetails.bitacora.length > 0) {
        detailsContent += `
          <h3 style="margin-top: 20px;">Bitácora (Últimas 10 acciones)</h3>
          <div style="max-height: 200px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f2f2f2;">
                  <th style="padding: 8px; border: 1px solid #ddd;">Fecha</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">Acción</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">Error</th>
                </tr>
              </thead>
              <tbody>
                ${userDetails.bitacora.map(log => `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${new Date(log.Fecha).toLocaleString()}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${log.Accion}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${log.Error || 'Ninguno'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      detailsContent += `</div>`;

      Swal.fire({
        title: `Detalles de ${user.Nombre}`,
        html: detailsContent,
        width: '800px',
        confirmButtonText: 'Cerrar'
      });
    } catch (error) {
      console.error("Error al obtener detalles del usuario:", error);
      Swal.fire('Error', 'No se pudieron obtener los detalles del usuario', 'error');
    }
  };

  // Pagination controls
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Tab change handler
  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setCurrentPage(1);
  };

  // Search and filter handlers
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleRoleFilterChange = (event) => {
    setRoleFilter(event.target.value);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  // System clean access
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
                  
                  {selectedTab === 'users' && (
                    <div className="option__button button--add">
                      <button type="button" onClick={handleAddUser}>
                        Agregar Usuario
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="options__bottom">
                  <div className="option__search">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input 
                      type="search" 
                      placeholder="Buscar usuario"
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
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
                          <option value="Administrador">Administradores</option>
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

            {/* Users Table */}
            <div className="depuration__bottom">
              {loading ? (
                <div className="loading-container">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <p>Cargando usuarios...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="depuration__empty">
                  <i className="fa-solid fa-user-slash"></i>
                  <p>No se encontraron usuarios</p>
                </div>
              ) : (
                <>
                  <div className="bottom__title">
                    <h3>Lista de Usuarios</h3>
                  </div>
                  <table className="bottom__table">
                    <thead className="table__head">
                      <tr>
                        <th className="table__header">Nombre</th>
                        <th className="table__header">Apellidos</th>
                        <th className="table__header">Correo</th>
                        <th className="table__header">Rol</th>
                        <th className="table__header">Estado</th>
                        <th className="table__header">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="table__body">
                      {currentItems.map((user, index) => (
                        <tr className="table__row" key={index}>
                          <td className="table__data">{user.Nombre}</td>
                          <td className="table__data">{user.Apellido1} {user.Apellido2}</td>
                          <td className="table__data">{user.Correo}</td>
                          <td className="table__data">{user.Rol}</td>
                          <td className="table__data">
                            <span className={`status-badge ${user.Estado ? 'active' : 'inactive'}`}>
                              {user.Estado ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="table__data table__data--actions">
                            <button 
                              className="button__edit"
                              onClick={() => handleEditUser(user)}
                              title="Editar"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button 
                              className={`button__ban ${!user.Estado ? 'inactive' : ''}`}
                              onClick={() => handleToggleUserStatus(user)}
                              title={user.Estado ? 'Desactivar' : 'Activar'}
                            >
                              <i className="fa-solid fa-ban"></i>
                            </button>
                            <button 
                              className="button__delete"
                              onClick={() => handleDeleteUser(user)}
                              title="Eliminar"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                            <button 
                              className="button__view"
                              onClick={() => viewUserDetails(user)}
                              title="Ver detalles"
                            >
                              <i className="fa-solid fa-eye"></i>
                            </button>
                            {user.Rol !== 'Administrador' && (
                              <button 
                                className="button__password"
                                onClick={() => handleRestorePassword(user.Usuario_ID_PK)}
                                title="Restaurar contraseña"
                              >
                                <i className="fa-solid fa-key"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {totalPages > 1 && (
                    <div className="table__foot">
                      <div className="foot__buttons">
                        <button
                          className="button__page"
                          onClick={() => paginate(1)}
                          disabled={currentPage === 1}
                        >
                          <i className="fa-solid fa-angles-left"></i>
                        </button>
                        <button
                          className="button__page"
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <i className="fa-solid fa-angle-left"></i>
                        </button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(number => {
                            if (currentPage <= 3) {
                              return number <= 5;
                            } else if (currentPage >= totalPages - 2) {
                              return number >= totalPages - 4;
                            } else {
                              return number >= currentPage - 2 && number <= currentPage + 2;
                            }
                          })
                          .map(number => (
                            <button
                              key={number}
                              className={`button__page ${currentPage === number ? "active" : ""}`}
                              onClick={() => paginate(number)}
                            >
                              {number}
                            </button>
                          ))}
                        
                        <button
                          className="button__page"
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          <i className="fa-solid fa-angle-right"></i>
                        </button>
                        <button
                          className="button__page"
                          onClick={() => paginate(totalPages)}
                          disabled={currentPage === totalPages}
                        >
                          <i className="fa-solid fa-angles-right"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </LayoutAdmin>
  );
};

export default Depuration;