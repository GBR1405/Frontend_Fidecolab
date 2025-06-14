export const uploadImageToImgBB = async (file) => {
    const apiKey = process.env.REACT_APP_IMGBB_API_KEY;
    if (!apiKey) {
        console.error("API Key no definida");
        return { success: false, message: "API Key no definida" };
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: "POST",
            body: formData,
        });

        const data = await response.json();
        console.log("Respuesta completa:", data);

        if (data.success) {
            return { success: true, url: data.data.url };
        } else {
            // Detección de mantenimiento
            if (data.error?.message === "Imgbb is currently down for maintenance.") {
                return {
                    success: false,
                    message: "El servicio de alojamiento de imagen está en mantenimiento. Intenta más tarde.",
                };
            }

            return {
                success: false,
                message: "Error desconocido al subir la imagen.",
            };
        }
    } catch (error) {
        console.error("Error en la subida de la imagen:", error);
        return {
            success: false,
            message: "No se pudo conectar con el servidor de ImgBB.",
        };
    }
};
