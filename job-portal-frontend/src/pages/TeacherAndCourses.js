import React, { useEffect, useState } from "react";
import { processFileMiddleware } from '../LN/processFileMiddleware';
import "../styles/adminComponents.css";
import LayoutAdmin from "../components/LayoutAdmin";
import $ from "jquery";
import "datatables.net";
import Swal from 'sweetalert2';
import 'select2';
import Cookies from "js-cookie";
import Plantilla from '../docs/Plantilla.xlsx';

const apiUrl = process.env.REACT_APP_API_URL;
const token = Cookies.get("authToken");


const AdminProfessorCourses = () => {
    const [courses, setCourses] = useState([]);
    const [professors, setProfessors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [linkedCourses, setLinkedCourses] = useState([]);
    const [searchProfessor, setSearchProfessor] = useState('');
    const [searchCourse, setSearchCourse] = useState('');
    

    function descargarPDF(pdfBase64, fileName) {
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${pdfBase64}`;
        link.download = `${fileName}.pdf`;
        link.click();
    }

    const handleDeselectTeacher = () => {
        setSelectedTeacher(null);
        setLinkedCourses([]);
        applyRowSelectionEffect(null, 'teacher'); // Esto eliminará el resaltado
    };

    const handleRowClick = (id, type) => {
        if (typeof type !== 'string') {
            console.error('El parámetro "type" debe ser una cadena. Se recibió:', typeof type);
            return;
        }
        
        if (type === 'teacher') {
            setSelectedTeacher(prev => (prev === id ? null : id));
            if (id !== null) {
                fetchLinkedCourses(id); // Obtener cursos vinculados al profesor seleccionado
            } else {
                setLinkedCourses([]); // Limpiar cursos vinculados si no hay profesor seleccionado
            }
        } else if (type === 'course') {
            setSelectedCourse(prev => (prev === id ? null : id));
        }
    
        applyRowSelectionEffect(id, type);
    };

    const handleAssignGroup = async (grupoId) => {
        console.log(selectedTeacher)
        try {
            const response = await fetch(`${apiUrl}/add-grupo-profesor`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    profesorId: selectedTeacher,
                    grupoId: grupoId,
                }),
            });
    
            if (!response.ok) {
                throw new Error('Error al asignar el grupo');
            }
    
            const result = await response.json();


            Swal.fire('Éxito', result.message, 'success');
    
            // Actualizar la lista de cursos vinculados
            fetchLinkedCourses(selectedTeacher);
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'No se pudo asignar el grupo', 'error');
        }
    };

    const handleUnlinkGroup = async (grupoId) => {
        try {
            // Mostrar un modal de confirmación
            const { isConfirmed } = await Swal.fire({
                title: 'Desvincular Grupo',
                text: '¿Deseas desvincular este profesor del grupo?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, desvincular',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
            });
    
            // Si el usuario confirma, enviar la petición al backend
            if (isConfirmed) {
                const response = await fetch(`${apiUrl}/quit-grupo-profesor`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        profesorId: selectedTeacher,
                        grupoId: grupoId,
                    }),
                });
    
                if (!response.ok) {
                    throw new Error('Error al desvincular el grupo');
                }
    
                const result = await response.json();
                Swal.fire('Éxito', result.message, 'success');
    
                // Actualizar la lista de cursos vinculados
                fetchLinkedCourses(selectedTeacher);
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'No se pudo desvincular el grupo', 'error');
        }
    };
    
    const applyRowSelectionEffect = (selectedRow, type) => {
        const rows = document.querySelectorAll(`table#table${type.charAt(0).toUpperCase() + type.slice(1)} tbody tr`);
        
        rows.forEach(row => {
            const rowId = row.getAttribute("data-id");
            if (rowId) {
                if (selectedRow !== null && parseInt(rowId) === selectedRow) {
                    row.classList.add("selected");
                } else {
                    row.classList.remove("selected");
                }
            }
        });
    };

    const fetchLinkedCourses = async (professorId) => {
        try {
            const response = await fetch(`${apiUrl}/get-cursos-by-profesor/${professorId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(response)
    
            if (!response.ok) {
                throw new Error('Error al obtener los cursos vinculados');
            }
    
            const data = await response.json();
            console.log(data)
            setLinkedCourses(data); // Actualizar el estado con los cursos vinculados
        } catch (error) {
            console.error('Error:', error);
            setLinkedCourses([]); // Limpiar cursos vinculados en caso de error
        }
    };
    
    const handleOpenModal = async () => {
        try {
            // Obtener los grupos disponibles desde el backend
            const response = await fetch(`${apiUrl}/get-grupos-disponibles`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
    
            if (!response.ok) {
                throw new Error('Error al obtener los grupos disponibles');
            }
    
            const data = await response.json();
            const gruposDisponibles = data.grupos;
    
            // Mostrar el modal con SweetAlert2
            const { value: selectedGroupId } = await Swal.fire({
                title: 'Asignar Grupo',
                html: `
                    <div style="position: relative;">
                        <input 
                            type="text" 
                            id="searchInput" 
                            placeholder="Buscar grupo..." 
                            style="width: 100%; padding: 8px; margin-bottom: 10px;"
                        />
                        <div id="dropdownContainer" style="position: relative;">
                            <ul id="dropdownList" style="list-style: none; padding: 0; margin: 0; border: 1px solid #ccc; max-height: 200px; overflow-y: auto;">
                                ${gruposDisponibles.map(grupo => `
                                    <li 
                                        data-value="${grupo.id}" 
                                        style="padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;"
                                        onmouseover="this.style.backgroundColor='#f1f1f1'" 
                                        onmouseout="this.style.backgroundColor='transparent'"
                                    >
                                        ${grupo.codigo} - ${grupo.nombre} (Grupo ${grupo.grupo})
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Asignar',
                cancelButtonText: 'Cancelar',
                width: '600px', // Hacer el modal más ancho
                customClass: {
                    popup: 'custom-modal', // Clase personalizada para el modal
                },
                didOpen: () => {
                    const searchInput = document.getElementById('searchInput');
                    const dropdownList = document.getElementById('dropdownList');
    
                    // Filtrar las opciones mientras el usuario escribe
                    searchInput.addEventListener('input', (e) => {
                        const searchText = e.target.value.toLowerCase();
    
                        // Filtrar las opciones
                        Array.from(dropdownList.children).forEach(li => {
                            const optionText = li.textContent.toLowerCase();
                            if (optionText.includes(searchText)) {
                                li.style.display = 'block';
                            } else {
                                li.style.display = 'none';
                            }
                        });
                    });
    
                    // Seleccionar una opción al hacer clic
                    dropdownList.addEventListener('click', (e) => {
                        if (e.target.tagName === 'LI') {
                            const selectedValue = e.target.getAttribute('data-value');
                            Swal.close();
                            handleAssignGroup(selectedValue);
                        }
                    });
                },
                preConfirm: () => {
                    // No necesitamos preConfirm porque la selección se maneja en el evento click
                    return null;
                },
            });
    
            // Si el usuario seleccionó un grupo, enviar la petición al backend
            if (selectedGroupId) {
                await handleAssignGroup(selectedGroupId);
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'No se pudo cargar la lista de grupos', 'error');
        }
    };
    

    useEffect(() => {
        const fetchProfessors = async () => {
            try {
                if (!token) {
                    throw new Error('No se ha encontrado un token de autenticación');
                }

                const response = await fetch(`${apiUrl}/get-profesores`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Error al obtener los profesores');
                }

                const data = await response.json();
                setProfessors((data.professors || []).reverse()); // Asegurar que siempre es un array
            } catch (error) {
                console.error('Error:', error);
                setProfessors([]); // Evitar undefined
            }
        };

        const fetchCourses = async () => {
            try {
                if (!token) {
                    throw new Error('No se ha encontrado un token de autenticación');
                }
        
                const response = await fetch(`${apiUrl}/get-cursos`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
        
                if (!response.ok) {
                    throw new Error('Error al obtener los cursos');
                }
        
                const data = await response.json(); // Convertir la respuesta a JSON
                console.log("Datos recibidos de cursos:", data); // Verificar que se recibe la estructura correcta
        
                setCourses(data.groups || []); // Asegurar que siempre es un array
            } catch (error) {
                console.error('Error:', error);
                setCourses([]); // Evitar undefined
            }
        };
        

        Promise.all([fetchProfessors(), fetchCourses()]).finally(() => setLoading(false));
    }, []);

    // Muestra un alerta de éxito
    const showSuccessAlert = (message) => {
        Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: message,
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#3e8e41'
        }).then(() => {
            window.location.reload();
        });
    };

    // Muestra una alerta de error
    const showErrorAlert = (message) => {
        Swal.fire({
            icon: 'error',
            title: '¡Error!',
            text: message,
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#d33'
        });
    };

    const handleShowCourseDetails = async (cursoId) => {
        
        try {
            const response = await fetch(`${apiUrl}/detalles-curso/${cursoId}`, {
                method: "GET",
                credentials: "include",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();

            const profesorHTML = data.profesor
                ? `<strong style="color:#2980b9">Profesor:</strong> ${data.profesor.Nombre} ${data.profesor.Apellido1} ${data.profesor.Apellido2} (${data.profesor.Correo})`
                : `<strong style="color:#e67e22">Profesor:</strong> <em>Ninguno vinculado</em>`;

            const estudiantesHTML = data.estudiantes.length > 0
                ? data.estudiantes.map(e => `
                    <li style="margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">
                        <strong style="color:#34495e">${e.Nombre} ${e.Apellido1} ${e.Apellido2}</strong><br/>
                        <span style="color:#7f8c8d">${e.Correo}</span>
                    </li>
                `).join("")
                : `<em style="color: gray;">No hay estudiantes vinculados.</em>`;

            Swal.fire({
                title: 'Detalles del Curso',
                html: `
                    <div style="text-align: left; font-size: 0.95rem;">
                        <div style="margin-bottom: 12px;">${profesorHTML}</div>
                        <div><strong style="color:#2980b9">Estudiantes:</strong></div>
                        <div style="max-height: 250px; overflow-y: auto; margin-top: 8px; padding-right: 5px;">
                            <ul style="list-style: none; padding-left: 0;">${estudiantesHTML}</ul>
                        </div>
                    </div>
                `,
                width: '600px',
                confirmButtonText: 'Cerrar',
                customClass: {
                    popup: 'custom-modal-curso-detalles'
                }
            });

        } catch (error) {
            console.error("Error:", error);
            Swal.fire("Error", "No se pudieron obtener los detalles del curso.", "error");
        }
    };


    const handleAddCourse = () => {
    Swal.fire({
        title: 'Agregar Curso',
        html: `
            <input type="text" id="courseCode" class="swal2-input" placeholder="Ej: AL-1234" maxlength="9">
            <input type="text" id="courseName" class="swal2-input" placeholder="Nombre del curso">
        `,
        confirmButtonText: 'Agregar',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        didOpen: () => {
            const courseCodeInput = document.getElementById("courseCode");
            const courseNameInput = document.getElementById("courseName");

            let previousValue = ""; // Guardar valor anterior del input

            courseCodeInput.addEventListener("input", (e) => {
                let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, "");
                let current = raw;
                let parts = raw.split("-");

                // Detectar si se eliminó el guion manualmente
                if (previousValue.includes("-") && !current.includes("-")) {
                    // Eliminar última letra también
                    const letras = previousValue.replace(/[^A-Z]/g, "").slice(0, -1);
                    e.target.value = letras;
                    previousValue = letras;
                    return;
                }

                // CASO 1: Letras (máximo 2)
                if (parts.length === 1 && parts[0].length <= 2) {
                    e.target.value = parts[0];
                    if (parts[0].length === 2) {
                        e.target.value = parts[0] + "-";
                    }
                    previousValue = e.target.value;
                    return;
                }

                // CASO 2: Números después del guion
                if (parts.length === 2) {
                    let letras = parts[0].substring(0, 2);
                    let numeros = parts[1].substring(0, 4).replace(/[^0-9]/g, "");
                    e.target.value = letras + "-" + numeros;
                    previousValue = e.target.value;
                    return;
                }

                // Fallback para evitar errores
                previousValue = e.target.value;
            });
        },
        preConfirm: async () => {
            const code = document.getElementById('courseCode').value.trim();
            const name = document.getElementById('courseName').value.trim();
            const codeRegex = /^[A-Z]{2}-\d{1,4}$/;

            if (!codeRegex.test(code)) {
                Swal.showValidationMessage("El código debe tener el formato XX-1234 (2 letras + guion + hasta 4 números).");
                return false;
            }

            if (!name) {
                Swal.showValidationMessage("Por favor ingresa el nombre del curso.");
                return false;
            }

            try {
                const response = await fetch(`${apiUrl}/add-course`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        codigoCurso: code,
                        nombreCurso: name
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Error desconocido");
                }

                Swal.fire('Éxito', 'Curso agregado con éxito', 'success')
                    .then(() => window.location.reload());
            } catch (error) {
                Swal.fire('Error', error.message, 'error');
            }
        }
    });
};




    
    

    const handleAddGroup = async () => {
    try {
        const response = await fetch(`${apiUrl}/cursos`);
        const courses = await response.json();

        if (!response.ok) throw new Error("Error al obtener cursos");

        Swal.fire({
            title: 'Agregar Grupo',
            html: `
                <div style="position: relative;">
                    <input 
                        type="text" 
                        id="searchCourseInput" 
                        placeholder="Buscar curso..." 
                        style="width: 100%; padding: 8px; margin-bottom: 10px;"
                    />
                    <ul id="courseDropdown" style="list-style: none; padding: 0; margin: 0; border: 1px solid #ccc; max-height: 200px; overflow-y: auto;">
                        ${courses.map(course => `
                            <li 
                                data-id="${course.id}" 
                                style="padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;"
                                onmouseover="this.style.backgroundColor='#f1f1f1'" 
                                onmouseout="this.style.backgroundColor='transparent'"
                            >
                                ${course.codigo} - ${course.nombre}
                            </li>
                        `).join('')}
                    </ul>
                    <div id="groupPreview" style="margin-top: 12px; font-weight: bold;"></div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Agregar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const selectedId = document.getElementById('courseDropdown').getAttribute('data-selected');
                if (!selectedId) {
                    Swal.showValidationMessage("Selecciona un curso.");
                    return false;
                }
                return selectedId;
            },
            didOpen: () => {
                const input = document.getElementById('searchCourseInput');
                const list = document.getElementById('courseDropdown');

                input.addEventListener('input', () => {
                    const text = input.value.toLowerCase();
                    Array.from(list.children).forEach(li => {
                        li.style.display = li.textContent.toLowerCase().includes(text) ? 'block' : 'none';
                    });
                });

                list.addEventListener('click', async (e) => {
                    if (e.target.tagName === 'LI') {
                        const selectedId = e.target.getAttribute('data-id');
                        list.setAttribute('data-selected', selectedId);

                        // Estética
                        Array.from(list.children).forEach(li => li.style.fontWeight = 'normal');
                        e.target.style.fontWeight = 'bold';

                        try {
                            const groupResponse = await fetch(`${apiUrl}/cursos/${selectedId}/ultimo-grupo`, {
                                method: "GET",
                                credentials: "include",
                                headers: {
                                    "Authorization": `Bearer ${token}`,
                                    "Content-Type": "application/json"
                                }
                            });
                            const latestGroup = await groupResponse.json();
                            const nextGroupNumber = latestGroup.numero + 1;
                            document.getElementById('groupPreview').innerText = `Se creará el grupo G${nextGroupNumber}`;
                        } catch (err) {
                            document.getElementById('groupPreview').innerText = "Error al obtener grupo";
                        }
                    }
                });
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                const cursoId = result.value;

                try {
                    const groupPreview = document.getElementById('groupPreview').innerText;
                    const grupoNumero = parseInt(groupPreview.replace(/\D/g, ""), 10);

                    const res = await fetch(`${apiUrl}/add-grupos`, {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            cursoId,
                            grupoNumero
                        })
                    });

                    const data = await res.json();

                    if (!res.ok) throw new Error(data.mensaje || "Error al agregar grupo");

                    Swal.fire("Éxito", "Grupo agregado con éxito", "success")
                        .then(() => window.location.reload());
                } catch (error) {
                    Swal.fire("Error", error.message, "error");
                }
            }
        });
    } catch (err) {
        console.error(err);
        Swal.fire("Error", "No se pudieron obtener los cursos.", "error");
    }
};
    
    

    const handleAddProfessor = () => {
        Swal.fire({
            title: 'Agregar Profesor',
            html: `
                <div class="swal2-tabs">
                    <button class="swal2-tab" data-tab="1">Agregar via CSV/XLSX</button>
                    <button class="swal2-tab" data-tab="2">Agregar Manualmente</button>
                    </div>
                    <div class="swal2-tab-content">
                    <!-- Tab 1: Agregar via archivo -->
                    <div class="tab-1-content" id="tab-1-content" style="display: none;">
                        <input type="file" id="fileInput" class="custom-file-input" accept=".xlsx, .xls" />
                        <div style="margin-top: 10px; text-align: center;">
                        <a href="${Plantilla}" download="Plantilla.xlsx" style="
                            display: inline-block;
                            background-color: #3498db;
                            color: white;
                            padding: 8px 16px;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.9rem;
                            text-decoration: none;
                            font-family: inherit;
                        ">
                            Descargar Plantilla
                        </a>
                        </div>
                    </div>
                    

                    <!-- Tab 2: Agregar manualmente -->
                    <div class="tab-2-content" id="tab-2-content" style="display: none;">
                        <input type="text" id="professorName" placeholder="Nombre" class="swal2-input" />
                        <input type="text" id="professorLastName1" placeholder="Apellido 1" class="swal2-input" />
                        <input type="text" id="professorLastName2" placeholder="Apellido 2" class="swal2-input" />
                        <input type="email" id="professorEmail" placeholder="Correo" class="swal2-input" />
                        
                        <!-- Select para el género -->
                        <select id="professorGender" class="swal2-input">
                            <option value="1">Hombre</option>
                            <option value="2">Mujer</option>
                            <option value="3">Indefinido</option>
                        </select>
                    </div>
                </div>
            `,
            confirmButtonText: 'Agregar',
            cancelButtonText: 'Cerrar',
            showCancelButton: true,
            didOpen: () => {
                const tabs = document.querySelectorAll('.swal2-tab');
                const tabContent = document.querySelectorAll('.swal2-tab-content > div');

                tabContent.forEach(content => content.style.display = 'none');
                document.getElementById('tab-1-content').style.display = 'block';

                tabs.forEach(tab => {
                    tab.addEventListener('click', function () {
                        tabContent.forEach(content => content.style.display = 'none');
                        document.getElementById(`tab-${this.getAttribute('data-tab')}-content`).style.display = 'block';
                        tabs.forEach(tab => tab.classList.remove('active'));
                        this.classList.add('active');
                    });
                });

                tabs[0].classList.add('active');
            },
            preConfirm: async () => {
                const isManual = document.querySelector('.swal2-tab.active').getAttribute('data-tab') === '2';
            
                if (isManual) {
                    // Capturar datos del formulario
                    const name = document.getElementById('professorName').value.trim();
                    const lastName1 = document.getElementById('professorLastName1').value.trim();
                    const lastName2 = document.getElementById('professorLastName2').value.trim();
                    const email = document.getElementById('professorEmail').value.trim();
                    const gender = document.getElementById('professorGender').value.trim();
            
                    if (!name || !lastName1 || !lastName2 || !email || !gender) {
                        showErrorAlert("Por favor completa todos los campos.");
                        return false;
                    }
            
                    try {
                        const response = await fetch(`${apiUrl}/add-profesor`, {
                            method: 'POST',
                            credentials: 'include',  // Asegúrate de que las cookies (si usas cookies para el token) se incluyan
                            headers: {
                                'Authorization': `Bearer ${token}`,  // Asegúrate de tener el token de acceso
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                manual: "true",  // Indicar que es una carga manual
                                name,
                                lastName1,
                                lastName2,
                                email,
                                gender
                            })
                        });
            
                        const result = await response.json();
                        if (response.ok) {
                        const { mensaje, pdfBase64 } = result; // Desestructuración para obtener la cantidad de omitidos
                            
                        Swal.fire({
                            icon: 'success',
                            title: '¡Profesores agregados!',
                            text: `${mensaje}.`,
                            confirmButtonText: 'Aceptar',
                            confirmButtonColor: '#3e8e41'
                        }).then(() => {
                           // Descargar PDF después del mensaje de éxito
                           descargarPDF(pdfBase64, "Credenciales_Generadas");
                           window.location.reload(); // Recargar la página después
                        });
                        } else {
                            showErrorAlert(result.message);
                        }
                    } catch (error) {
                        showErrorAlert("Error al agregar el profesor.");
                    }
                } else {
                    const fileInput = document.getElementById('fileInput').files[0];
                    if (!fileInput) {
                        showErrorAlert("Por favor sube un archivo.");
                        return false;
                    }
            
                    try {
                        // Usar el middleware para procesar el archivo
                        const profesores = await processFileMiddleware(fileInput);
            
                        // Crear el objeto JSON con los datos procesados
                        const dataToSend = {
                            manual: "false",  // Indicar que es una carga desde archivo
                            profesores, // Los datos procesados
                        };
            
                        // Enviar los datos al backend
                        const response = await fetch(`${apiUrl}/add-profesor`, {
                            method: 'POST',
                            credentials: 'include',  // Incluir cookies si las usas
                            headers: {
                                'Authorization': `Bearer ${token}`,  // Asegúrate de que el token esté en el encabezado
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(dataToSend)  // Enviar solo los datos procesados
                        });
            
                    const result = await response.json();
                        if (response.ok) {
                            const { mensaje, pdfBase64 } = result; // Desestructuración para obtener la cantidad de omitidos
                                
                        Swal.fire({
                            icon: 'success',
                            title: '¡Profesores Agregados!',
                            text: `${mensaje}.`,
                            confirmButtonText: 'Aceptar',
                            confirmButtonColor: '#3e8e41'
                            }).then(() => {
                               // Descargar PDF después del mensaje de éxito
                               descargarPDF(pdfBase64, "Credenciales_Generadas");
                               window.location.reload(); // Recargar la página después
                            });
                     } else {
                                showErrorAlert(result.message);
                    }
                    } catch (error) {
                        showErrorAlert("Error al procesar el archivo.");
                    }
                }
            }
        });
    };
    

    const handleAssign = () => {
        Swal.fire({
            title: 'Asignar Curso',
            html: `
                <select id="selectAssignCourse" class="swal2-input">
                    <option value="" disabled selected>Selecciona un curso</option>
                    <option value="1">Curso 1</option>
                    <option value="2">Curso 2</option>
                    <option value="3">Curso 3</option>
                </select>
            `,
            confirmButtonText: 'Asignar',
            cancelButtonText: 'Cerrar',
            showCancelButton: true,
            preConfirm: () => {
                const selectedCourse = document.getElementById('selectAssignCourse').value;
                if (!selectedCourse) {
                    showErrorAlert("Por favor selecciona un curso.");
                    return false;
                }
                // Aquí va la lógica para asignar el curso
                showSuccessAlert('Curso asignado con éxito')
                .then(() => {
                    // Recargar la página después de que el usuario cierre la alerta
                    window.location.reload();
                });
            }
        });
    };

    const handleDelete = () => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "Este cambio es irreversible",
            icon: 'warning',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonText: 'Eliminar',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d'
        }).then((result) => {
            if (result.isConfirmed) {
                // Lógica para eliminar
                showSuccessAlert('Curso eliminado con éxito')
                .then(() => {
                    // Recargar la página después de que el usuario cierre la alerta
                    window.location.reload();
                });
            }
        });
    };

    const handleEditCourse = (course) => {
        console.log(course)
  Swal.fire({
    title: 'Editar Curso',
    html: `
      <input type="text" id="editCourseCode" class="swal2-input" value="${course.codigo}" placeholder="Ej: AL-1234" maxlength="9">
      <input type="text" id="editCourseName" class="swal2-input" value="${course.nombre}" placeholder="Nombre del curso">
    `,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar',
    showCancelButton: true,
    didOpen: () => {
      const codeInput = document.getElementById("editCourseCode");
      let previousValue = codeInput.value;

      codeInput.addEventListener("input", (e) => {
        let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, "");
        let current = raw;
        let parts = raw.split("-");

        if (previousValue.includes("-") && !current.includes("-")) {
          const letras = previousValue.replace(/[^A-Z]/g, "").slice(0, -1);
          e.target.value = letras;
          previousValue = letras;
          return;
        }

        if (parts.length === 1 && parts[0].length <= 2) {
          e.target.value = parts[0];
          if (parts[0].length === 2) {
            e.target.value = parts[0] + "-";
          }
          previousValue = e.target.value;
          return;
        }

        if (parts.length === 2) {
          let letras = parts[0].substring(0, 2);
          let numeros = parts[1].substring(0, 4).replace(/[^0-9]/g, "");
          e.target.value = letras + "-" + numeros;
          previousValue = e.target.value;
          return;
        }

        previousValue = e.target.value;
      });
    },
    preConfirm: async () => {
      const newCode = document.getElementById('editCourseCode').value.trim();
      const newName = document.getElementById('editCourseName').value.trim();
      const codeRegex = /^[A-Z]{2}-\d{1,4}$/;

      if (!codeRegex.test(newCode)) {
        Swal.showValidationMessage("El código debe tener formato XX-1234 (2 letras, guion, 1–4 números).");
        return false;
      }

      if (!newName) {
        Swal.showValidationMessage("El nombre del curso no puede estar vacío.");
        return false;
      }

      try {
        const response = await fetch(`${apiUrl}/editar-curso`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            grupoCursoId: course.id, // CAMBIO CLAVE
            nuevoNombre: newName,
            nuevoCodigo: newCode
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Error al editar curso");
        }

        Swal.fire('Éxito', 'Curso editado correctamente', 'success').then(() => {
          window.location.reload();
        });
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  });
};



const handleDeleteCourse = (grupoCursoId) => {
    console.log(grupoCursoId)
  Swal.fire({
    title: '¿Deseas eliminar este curso?',
    html: `
      <p>Todos los profesores y estudiantes vinculados a sus grupos serán <strong>desvinculados</strong>.</p>
      <p>¿Estás seguro?</p>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${apiUrl}/eliminar-curso`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ grupoCursoId }) // CAMBIO CLAVE
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Error al eliminar curso");
        }

        Swal.fire('Éxito', 'Curso eliminado correctamente', 'success').then(() => {
          window.location.reload();
        });
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  });
};




    // Estados para paginación
    const [currentPageProfessors, setCurrentPageProfessors] = useState(1);
    const [currentPageCourses, setCurrentPageCourses] = useState(1);
    const [currentPageLinkedCourses, setCurrentPageLinkedCourses] = useState(1);
    const [itemsPerPage] = useState(5);

    // Cálculos para profesores
    const indexOfLastProfessor = currentPageProfessors * itemsPerPage;
    const indexOfFirstProfessor = indexOfLastProfessor - itemsPerPage;
    const filteredProfessors = professors.filter(professor => {
        if (!searchProfessor) return true;
        
        const fullName = `${professor.Nombre} ${professor.Apellido1} ${professor.Apellido2}`.toLowerCase();
        const email = professor.Correo.toLowerCase();
        const searchTerm = searchProfessor.toLowerCase();
        
        return fullName.includes(searchTerm) || email.includes(searchTerm);
    });
    const currentProfessors = filteredProfessors.slice(indexOfFirstProfessor, indexOfLastProfessor);
    const totalPagesProfessors = Math.ceil(filteredProfessors.length / itemsPerPage);

    // Cálculos para cursos
    const indexOfLastCourse = currentPageCourses * itemsPerPage;
    const indexOfFirstCourse = indexOfLastCourse - itemsPerPage;
    const filteredCourses = courses.filter(course => {
        if (!searchCourse) return true;
        
        const courseName = `${course.codigo} ${course.nombre}`.toLowerCase();
        const searchTerm = searchCourse.toLowerCase();
        
        return courseName.includes(searchTerm);
    });
    const currentCourses = filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse);
    const totalPagesCourses = Math.ceil(filteredCourses.length / itemsPerPage);

    // Cálculos para cursos vinculados
    const indexOfLastLinkedCourse = currentPageLinkedCourses * itemsPerPage;
    const indexOfFirstLinkedCourse = indexOfLastLinkedCourse - itemsPerPage;
    const currentLinkedCourses = linkedCourses.slice(indexOfFirstLinkedCourse, indexOfLastLinkedCourse);




    const totalPagesLinkedCourses = Math.ceil(linkedCourses.length / itemsPerPage);

    // Cambiar página
    const paginateProfessors = (pageNumber) => setCurrentPageProfessors(pageNumber);
    const paginateCourses = (pageNumber) => setCurrentPageCourses(pageNumber);
    const paginateLinkedCourses = (pageNumber) => setCurrentPageLinkedCourses(pageNumber);


    return (
        <>
          <LayoutAdmin>
            <section className="add__container">
              <div className="container__title">
                <h3>Profesores y Cursos</h3>
              </div>
              <div className="container__options">
                <div className="option__filters">
                  <input 
                    className="filter__input" 
                    type="text" 
                    placeholder="Buscar profesor..." 
                    value={searchProfessor}
                    onChange={(e) => setSearchProfessor(e.target.value)}
                    disabled={selectedTeacher !== null}
                  />
                  <div className="filter__course">
                    <input 
                        className="filter__course__input"
                        type="text" 
                        placeholder="Buscar curso..." 
                        value={searchCourse}
                        onChange={(e) => setSearchCourse(e.target.value)}
                        disabled={selectedTeacher !== null}
                    />
                  </div>
                </div>
                <div className="option__buttons">
                  <div className="option__button">
                    <button onClick={handleAddCourse} type="submit">Agregar Curso</button>
                  </div>
                  <div className="option__button">
                    <button onClick={handleAddGroup} type="submit">Agregar Grupo</button>
                  </div>
                </div>
              </div>
              <div className="container__content">
                    <div className="content__box">
                            <div className="box__title">
                                <h3>Lista Profesores</h3>
                            </div>
                            <table className="box__table" id="tableTeacher">
                                <thead className="table__head">
                                    <th className="disapear">Codigo</th>
                                    <th className="table__header">Nombre</th>
                                    <th className="table__header">Correo</th>
                                </thead>
                                <tbody className="table__body">
                                    {loading ? (
                                        <tr className="table__row">
                                            <td colSpan="3">Cargando...</td>
                                        </tr>
                                    ) : (
                                        currentProfessors.map((professor) => (
                                            <tr
                                                key={professor.Usuario_ID_PK}
                                                data-id={professor.Usuario_ID_PK}
                                                onClick={() => handleRowClick(professor.Usuario_ID_PK, 'teacher')}
                                                className="table__row"
                                            >
                                                <td className="disapear">{professor.Usuario_ID_PK}</td>
                                                <td className="table__data">{professor.Nombre} {professor.Apellido1} {professor.Apellido2}</td>
                                                <td className="table__data">{professor.Correo}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot className="table__foot">
                                    {totalPagesProfessors > 1 && (
                                        <div className="foot__buttons">                            
                                            {/* Mostrar páginas alrededor de la página actual */}
                                            {Array.from({ length: totalPagesProfessors }, (_, i) => i + 1)
                                                .filter(number => {
                                                  let pageNumber;
                                                  if (currentPageProfessors === 1 || currentPageProfessors === 2) {
                                                    pageNumber = currentPageProfessors === 1? number <= 5 : number >= currentPageProfessors - 1 && number <= currentPageProfessors + 3;
                                                  }
                                                  if (currentPageProfessors > 2 && currentPageProfessors < totalPagesProfessors -1) {
                                                    pageNumber = number >= currentPageProfessors - 2 && number <= currentPageProfessors + 2 && number > 0 && number <= totalPagesProfessors;
                                                  }  
                                                  if (currentPageProfessors === totalPagesProfessors - 1 || currentPageProfessors === totalPagesProfessors) {
                                                    pageNumber = currentPageProfessors === totalPagesProfessors ? number >= currentPageProfessors - 4 : number >= currentPageProfessors - 3 && number <= currentPageProfessors + 1;
                                                  }                                                 
                                                  return pageNumber;                            
                                                })
                                                .map(number => (
                                                    <button 
                                                        className={`button__page ${currentPageProfessors === number ? "active" : ""}`}
                                                        key={number}
                                                        onClick={() => paginateProfessors(number)}
                                                    >
                                                        {number}
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </tfoot>
                            </table>
                    </div>
                    <div className="content__box">
                            <div className="box__title">
                                <h3>Lista Cursos</h3>
                            </div>
                            <table className="box__table">
                                <thead className="table__head">
                                    <th className="table__header" style={{ width: "60%" }}>Curso</th>
                                    <th className="table__header" style={{ width: "15%", textAlign: "center" }}>Grupo</th>
                                    <th className="table__header" style={{ width: "12%", textAlign: "center" }}>Detalles</th>
                                    <th className="table__header" style={{ width: "13%", textAlign: "center" }}>Acciones</th>
                                </thead>
                                <tbody className="table__body">
                                    {loading ? (
                                        <tr className="table__row">
                                            <td colSpan={selectedTeacher ? 3 : 2}>Cargando cursos...</td>
                                        </tr>
                                    ) : (
                                        (selectedTeacher ? currentLinkedCourses : currentCourses).map((course) => (
                                            <tr
                                            className="table__row"
                                            key={course.id}
                                            data-id={course.id}
                                            onClick={() => handleRowClick(course.id, 'course')}
                                        >
                                            <td className="table__data" style={{ width: "60%", maxWidth: "60%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {`${course.codigo ?? "Sin código"} - ${course.nombre ?? "Sin nombre"}`}
                                            </td>

                                            <td className="table__data" style={{ width: "15%", textAlign: "center" }}>
                                            {`G${course.grupo ?? "Sin grupo"}`}
                                            </td>

                                            {/* Detalles */}
                                            <td className="table__data" style={{ width: "12%", textAlign: "center" }}>
                                             <button className="data__button button--info"
                                                onClick={(e) => {
                                                e.stopPropagation();
                                                console.log("Detalles del curso:", course);
                                                handleShowCourseDetails(course.Curso_ID_FK || course.Curso_ID || course.id); // ajusta según estructura
                                                }}
                                            >
                                                <i className="fa-solid fa-circle-info"></i>
                                            </button>
                                            </td>

                                            {/* Acciones */}
                                            <td className="table__data" style={{ width: "13%", textAlign: "center" }}>
                                            {selectedTeacher ? (
                                                <button className="data__button button--desactive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUnlinkGroup(course.id);
                                                }}
                                                >
                                                <i className="fa-solid fa-link-slash"></i>
                                                </button>
                                            ) : (
                                                <>
                                                <button
                                                    className="data__button button--edit"
                                                    onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditCourse(course);
                                                    }}
                                                >
                                                    <i className="fa-solid fa-pen-to-square"></i>
                                                </button>
                                                <button
                                                    className="data__button button--desactive"
                                                    onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteCourse(course.Curso_ID_FK || course.id);
                                                    }}
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                                </>
                                                
                                            )}
                                            </td>
                                        </tr>
                                                                                ))
                                    )}
                                </tbody>
                                <tfoot className="table__foot">
                                    {selectedTeacher ? (
                                        // Paginación para cursos vinculados
                                        <>                                            
                                            {totalPagesLinkedCourses > 1 && (
                                                <div className="foot__buttons">                            
                                                    {/* Mostrar páginas alrededor de la página actual */}
                                                    {Array.from({ length: totalPagesLinkedCourses }, (_, i) => i + 1)
                                                        .filter(number => {
                                                          let pageNumber;
                                                          if (currentPageLinkedCourses === 1 || currentPageLinkedCourses === 2) {
                                                            pageNumber = currentPageLinkedCourses === 1? number <= 5 : number >= currentPageLinkedCourses - 1 && number <= currentPageLinkedCourses + 3;
                                                          }
                                                          if (currentPageLinkedCourses > 2 && currentPageLinkedCourses < totalPagesLinkedCourses -1) {
                                                            pageNumber = number >= currentPageLinkedCourses - 2 && number <= currentPageLinkedCourses + 2 && number > 0 && number <= totalPagesLinkedCourses;
                                                          }  
                                                          if (currentPageLinkedCourses === totalPagesLinkedCourses - 1 || currentPageLinkedCourses === totalPagesLinkedCourses) {
                                                            pageNumber = currentPageLinkedCourses === totalPagesLinkedCourses ? number >= currentPageLinkedCourses - 4 : number >= currentPageLinkedCourses - 3 && number <= currentPageLinkedCourses + 1;
                                                          }                                                 
                                                          return pageNumber;                            
                                                        })
                                                        .map(number => (
                                                            <button 
                                                                className={`button__page ${currentPageLinkedCourses === number ? "active" : ""}`}
                                                                key={number}
                                                                onClick={() => paginateLinkedCourses(number)}
                                                            >
                                                                {number}
                                                            </button>
                                                        ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        // Paginación para cursos normales
                                        <>
                                            {totalPagesCourses > 1 && (
                                                <div className="foot__buttons">                            
                                                    {/* Mostrar páginas alrededor de la página actual */}
                                                    {Array.from({ length: totalPagesCourses }, (_, i) => i + 1)
                                                        .filter(number => {
                                                          let pageNumber;
                                                          if (currentPageCourses === 1 || currentPageCourses === 2) {
                                                            pageNumber = currentPageCourses === 1? number <= 5 : number >= currentPageCourses - 1 && number <= currentPageCourses + 3;
                                                          }
                                                          if (currentPageCourses > 2 && currentPageCourses < totalPagesCourses -1) {
                                                            pageNumber = number >= currentPageCourses - 2 && number <= currentPageCourses + 2 && number > 0 && number <= totalPagesCourses;
                                                          }  
                                                          if (currentPageCourses === totalPagesCourses - 1 || currentPageCourses === totalPagesCourses) {
                                                            pageNumber = currentPageCourses === totalPagesCourses ? number >= currentPageCourses - 4 : number >= currentPageCourses - 3 && number <= currentPageCourses + 1;
                                                          }                                                 
                                                          return pageNumber;                            
                                                        })
                                                        .map(number => (
                                                            <button 
                                                                className={`button__page ${currentPageCourses === number ? "active" : ""}`}
                                                                key={number}
                                                                onClick={() => paginateCourses(number)}
                                                            >
                                                                {number}
                                                            </button>
                                                        ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </tfoot>
                            </table>
                    </div>
              </div>
              <div className="container__below">
                        <div className="below__box">
                            <div className="below__button">
                                <button onClick={handleAddProfessor} type="submit">Agregar Profesor</button>
                            </div>
                            {selectedTeacher && (
                                <div className="below__button">
                                    <button onClick={handleDeselectTeacher} type="submit">Deseleccionar</button>
                                </div>
                            )}
                        </div>
                        <div className="below__box">
                            {selectedTeacher && (
                                <div className="below__button">
                                    <button onClick={handleOpenModal} type="submit">Asignar</button>
                                </div>
                            )}
                        </div>
              </div>
            </section>
          </LayoutAdmin>
        </>
      );
};

export default AdminProfessorCourses;
