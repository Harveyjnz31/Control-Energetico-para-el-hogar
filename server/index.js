const express = require("express");
const cors = require("cors");
const multer = require("multer");
const xlsx = require("xlsx");

const app = express();

// Middlewares básicos para robustez
app.use(express.json());
app.use(cors());

// Definimos las columnas que el sistema espera obligatoriamente
const REQUIRED_COLUMNS = ["Fecha", "Consumo"];

// Configuración de multer para mayor seguridad
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Límite de 5MB por archivo
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no soportado. Por favor sube un Excel."));
    }
  },
});

// Endpoint para cargar y procesar el Excel
app.post("/api/upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió el archivo." });
    }

    try {
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      if (workbook.SheetNames.length === 0) {
        return res.status(400).json({ error: "El archivo Excel está vacío." });
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, {
        defval: null,
        raw: false,
        cellDates: true,
      });

      // Validamos que las columnas requeridas existan en la primera fila
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const missingColumns = REQUIRED_COLUMNS.filter(
          (col) => !headers.includes(col),
        );

        if (missingColumns.length > 0) {
          return res.status(400).json({
            error: `El archivo no es válido. Faltan las columnas: ${missingColumns.join(", ")}`,
          });
        }
      }

      return res.json({ sheetName, data });
    } catch (error) {
      next(error); // Enviamos el error al middleware global
    }
  });
});

// Endpoint para descargar una plantilla de ejemplo
app.get("/api/template", (req, res) => {
  try {
    const ws = xlsx.utils.json_to_sheet([
      { Fecha: "2023-10-01", Consumo: 45.5 },
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Plantilla");

    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=plantilla_datos.xlsx",
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: "No se pudo generar la plantilla." });
  }
});

// Endpoint de salud (útil para monitoreo)
app.get("/health", (req, res) => res.sendStatus(200));

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  console.error(`[SERVER ERROR] ${new Date().toISOString()}:`, err.stack);
  res.status(500).json({
    error: "Ocurrió un error interno en el servidor.",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend iniciado en http://localhost:${PORT}`);
});
