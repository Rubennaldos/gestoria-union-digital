// scripts/uploadFileAndGetURL.migracion.js
// Versión temporal para migración, compatible con Node.js CommonJS
const { getStorage, ref, uploadString, getDownloadURL } = require("firebase/storage");
const { app } = require("../src/config/firebase");

const storage = getStorage(app);

/**
 * Sube un archivo (base64/dataURL) a Firebase Storage y devuelve la URL de descarga.
 * Solo soporta cadenas base64/dataURL para migración.
 * @param {string} file - Cadena base64/dataURL
 * @param {string} folderName - Carpeta destino en Storage
 * @returns {Promise<string>} - URL pública
 */
async function uploadFileAndGetURL(file, folderName) {
  try {
    const fileName = `${Date.now()}_migracion.png`;
    const storageRef = ref(storage, `${folderName}/${fileName}`);
    await uploadString(storageRef, file, 'data_url');
    const downloadURL = await getDownloadURL(storageRef);
    console.log('Archivo subido con éxito. URL:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("Error al subir el archivo:", error);
    return "";
  }
}

module.exports = { uploadFileAndGetURL };
