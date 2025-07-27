import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import "../styles/adminComponents.css";
import LayoutAdmin from "../components/LayoutAdmin";
import Cookies from 'js-cookie';

const token = Cookies.get("authToken");

const Depuration = () => {
  const [selectedTab, setSelectedTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [showSystemClean, setShowSystemClean] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

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
      console.log("Users data received:", data);
      const normalizedUsers = data.users.map(user => ({
        ...user,
        id: user.Usuario_ID_PK || user.id 
      }));
      setUsers(normalizedUsers || []);
      setFilteredUsers(normalizedUsers || []);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      Swal.fire('Error', 'No se pudieron obtener los usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch courses from API
  const fetchCourses = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/cursos`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener cursos');
      }

      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error("Error al obtener cursos:", error);
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
        (user.Nombre && user.Nombre.toLowerCase().includes(query)) || 
        (user.Apellido1 && user.Apellido1.toLowerCase().includes(query)) ||
        (user.Apellido2 && user.Apellido2.toLowerCase().includes(query)) ||
        (user.Correo && user.Correo.toLowerCase().includes(query))
      );
    }

    setFilteredUsers(result);
    setCurrentPage(1);
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Load data when component mounts or tab changes
  useEffect(() => {
    if (selectedTab === 'users') {
      fetchUsers();
      fetchCourses();
    }
  }, [selectedTab]);

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Handle page change
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle tab change
  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setCurrentPage(1);
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Handle role filter change
  const handleRoleFilterChange = (event) => {
    setRoleFilter(event.target.value);
  };

  // Handle status filter change
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  // Add new user
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
        throw new Error('Error al agregar usuario');
      }

      await response.json();
      Swal.fire('Éxito', 'Usuario agregado correctamente', 'success');
      fetchUsers();
    } catch (error) {
      console.error("Error al agregar usuario:", error);
      Swal.fire('Error', 'No se pudo agregar el usuario', 'error');
    }
  };

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

  // Edit user
  const handleEditUser = async (user) => {
    // Get user's current courses
    let userCourses = [];
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/usuarios_D/${user.id}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.cursos) {
          userCourses = data.data.cursos.split(',').map(c => c.trim());
        }
      }
    } catch (error) {
      console.error("Error al obtener cursos del usuario:", error);
    }

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
        `</select>` +
        `<select id="swal-input5" class="swal2-input" required>` +
          `<option value="1" ${user.Genero === 'Masculino' ? 'selected' : ''}>Masculino</option>` +
          `<option value="2" ${user.Genero === 'Femenino' ? 'selected' : ''}>Femenino</option>` +
          `<option value="3" ${user.Genero === 'Otro' ? 'selected' : ''}>Otro</option>` +
        `</select>` +
        `<div style="margin: 10px 0;"><strong>Cursos:</strong></div>` +
        `<select id="swal-input6" class="swal2-input" multiple style="height: auto;">` +
          courses.map(course => 
            `<option value="${course.GrupoCurso_ID_PK}" ${userCourses.includes(course.Nombre_Curso) ? 'selected' : ''}>
              ${course.Nombre_Curso} - Grupo ${course.Codigo_Grupo}
            </option>`
          ).join('') +
        `</select>`,
      focusConfirm: false,
      preConfirm: () => {
        const nombre = document.getElementById('swal-input1').value;
        const apellido1 = document.getElementById('swal-input2').value;
        const apellido2 = document.getElementById('swal-input3').value;
        const rol = document.getElementById('swal-input4').value;
        const genero = document.getElementById('swal-input5').value;
        const cursos = Array.from(document.getElementById('swal-input6').selectedOptions)
                          .map(option => option.value);

        if (!nombre || !apellido1 || !apellido2 || !rol || !genero) {
          Swal.showValidationMessage('Todos los campos son obligatorios');
          return false;
        }

        return { nombre, apellido1, apellido2, rol, genero, cursos };
      },
      willOpen: () => {
        // Configure multiple select
        const select = document.getElementById('swal-input6');
        select.size = Math.min(5, courses.length);
      }
    });

    if (!formValues) return;

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/usuarios_D/${user.id}`, {
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
          genero: formValues.genero,
          cursos: formValues.cursos
        })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar usuario');
      }

      Swal.fire('Éxito', 'Usuario actualizado correctamente', 'success');
      fetchUsers();
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      Swal.fire('Error', 'No se pudo actualizar el usuario', 'error');
    }
  };

  // Restore password
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
        throw new Error('Error al restaurar contraseña');
      }

      Swal.fire('Éxito', 'Contraseña restablecida y correo enviado al usuario', 'success');
    } catch (error) {
      console.error("Error al restaurar contraseña:", error);
      Swal.fire('Error', 'No se pudo restaurar la contraseña', 'error');
    }
  };

  // Toggle user status
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
      const response = await fetch(`${apiUrl}/usuarios_D/${user.id}/desactivar`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          estado: newStatus
        })
      });

      if (!response.ok) {
        throw new Error(`Error al ${action} usuario`);
      }

      Swal.fire('Éxito', `Usuario ${action}do correctamente`, 'success');
      fetchUsers();
    } catch (error) {
      console.error(`Error al ${action} usuario:`, error);
      Swal.fire('Error', `No se pudo ${action} el usuario`, 'error');
    }
  };

  // Delete user
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
      console.log("User ID being sent:", user.id || user.Usuario_ID_PK);
      const response = await fetch(`${apiUrl}/usuarios_D/${user.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar usuario');
      }

      Swal.fire('Eliminado', 'El usuario ha sido eliminado correctamente', 'success');
      fetchUsers();
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      Swal.fire('Error', 'No se pudo eliminar el usuario', 'error');
    }
  };

  // View user details
  const viewUserDetails = async (user) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/usuarios_D/${user.id}`, {
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

      // Build HTML content based on user role
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

      // Show user's log
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

  // Unlink users
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

  // Access system clean
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

  // System clean functions
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

  // System clean interface
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
                  
                  {/* Actions based on tab */}
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
                  {loading ? (
                    <div className="loading-container">
                      <div className="loading-spinner"></div>
                      <p>Cargando usuarios...</p>
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
                          {currentItems.length > 0 ? (
                            currentItems.map((user, index) => (
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
                                      onClick={() => handleRestorePassword(user.id)}
                                      title="Restaurar contraseña"
                                    >
                                      <i className="fa-solid fa-key"></i>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr className="table__row">
                              <td colSpan="6" className="table__data table__data--empty">
                                No se encontraron usuarios
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="table__foot">
                          {totalPages > 1 && (
                            <tr>
                              <td colSpan="6">
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
                  )}
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