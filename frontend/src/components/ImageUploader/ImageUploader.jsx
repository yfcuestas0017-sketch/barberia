import { useRef, useState, useEffect } from "react";
import api from "../../services/api";
import "./ImageUploader.css";

/**
 * ImageUploader — componente reutilizable para seleccionar y subir una imagen.
 *
 * Props:
 *  - value      {string}   URL actual de la imagen (para mostrar preview).
 *  - onChange   {fn}       Callback que recibe la URL definitiva de Cloudinary.
 *  - label      {string}   Texto del label (por defecto "Foto").
 */
function ImageUploader({ value, onChange, label = "Foto" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || "");
  const [uploadError, setUploadError] = useState("");

  // Sincronizar preview cuando el padre cambia la prop value
  // (por ejemplo al abrir el modal de edición con otro registro)
  useEffect(() => {
    setPreview(value || "");
    setUploadError("");
  }, [value]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview inmediato con URL local
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploadError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("foto", file);

      const response = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Notifica al formulario padre con la URL de Cloudinary
      onChange(response.data.url);
      setPreview(response.data.url);
    } catch (error) {
      console.error("Error al subir imagen:", error);
      setUploadError(
        error.response?.data?.message || "No se pudo subir la imagen"
      );
      // Revertir al valor original si falla
      setPreview(value || "");
      onChange(value || "");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview("");
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="image-uploader">
      <label>{label}</label>

      {preview ? (
        <div className="image-uploader-preview">
          <img src={preview} alt="Vista previa" />

          <div className="image-uploader-overlay">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Subiendo..." : "Cambiar foto"}
            </button>

            <button
              type="button"
              className="remove-btn"
              onClick={handleRemove}
              disabled={uploading}
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <div
          className="image-uploader-dropzone"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <div className="uploader-spinner">
              <span className="spinner" />
              <span>Subiendo imagen...</span>
            </div>
          ) : (
            <>
              <span className="uploader-icon">📷</span>
              <span className="uploader-text">
                Haz clic para seleccionar una foto
              </span>
              <span className="uploader-hint">JPG, PNG o WEBP · Máx. 5 MB</span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {uploadError && (
        <small className="uploader-error">{uploadError}</small>
      )}
    </div>
  );
}

export default ImageUploader;
