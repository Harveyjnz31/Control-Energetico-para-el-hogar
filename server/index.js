const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const xlsx = require("xlsx");

const app = express();

app.use(express.json());
app.use(cors());

const REQUIRED_COLUMNS = ["Fecha", "Consumo"];
const ALLOWED_EXTENSIONS = new Set([".xlsx", ".xls", ".csv"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/plain",
]);

function normalizeHeader(header) {
  return String(header || "").trim().toLowerCase();
}

function getMissingColumns(headers) {
  const normalizedHeaders = headers.map(normalizeHeader);
  return REQUIRED_COLUMNS.filter(
    (requiredColumn) =>
      !normalizedHeaders.includes(normalizeHeader(requiredColumn)),
  );
}

function buildColumnMapping(headers) {
  return headers.reduce((mapping, header) => {
    const matchedColumn = REQUIRED_COLUMNS.find(
      (requiredColumn) =>
        normalizeHeader(requiredColumn) === normalizeHeader(header),
    );

    mapping[header] = matchedColumn || header;
    return mapping;
  }, {});
}

function serializeCellValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

function normalizeRows(rows, columnMapping) {
  return rows.map((row) =>
    Object.entries(row).reduce((normalizedRow, [key, value]) => {
      normalizedRow[columnMapping[key] || key] = serializeCellValue(value);
      return normalizedRow;
    }, {}),
  );
}

function getFileExtension(filename = "") {
  return path.extname(filename).toLowerCase();
}

function getWorksheetHeaders(worksheet) {
  const rows = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: false,
    defval: null,
    raw: false,
  });

  const firstRow = Array.isArray(rows[0]) ? rows[0] : [];
  return firstRow
    .map((header) => String(header ?? "").trim())
    .filter(Boolean);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const extension = getFileExtension(file.originalname);
    const hasValidExtension = ALLOWED_EXTENSIONS.has(extension);
    const hasValidMimeType = ALLOWED_MIME_TYPES.has(file.mimetype);

    if (hasValidExtension || hasValidMimeType) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "Tipo de archivo no soportado. Por favor sube un archivo Excel o CSV.",
      ),
    );
  },
});

app.post("/api/upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No se recibió el archivo." });
    }

    try {
      const fileExtension = getFileExtension(req.file.originalname);
      const isCsvFile = fileExtension === ".csv";
      const workbook = xlsx.read(req.file.buffer, {
        type: "buffer",
        raw: false,
        cellDates: true,
      });

      if (workbook.SheetNames.length === 0) {
        return res.status(400).json({
          error: "El archivo cargado está vacío o no contiene hojas válidas.",
        });
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const headers = getWorksheetHeaders(worksheet);

      if (!headers.length) {
        return res.status(400).json({
          error: "No se detectaron encabezados en el archivo cargado.",
        });
      }

      const missingColumns = getMissingColumns(headers);
      if (missingColumns.length > 0) {
        return res.status(400).json({
          error: `El archivo no es válido. Faltan las columnas: ${missingColumns.join(", ")}`,
        });
      }

      const rows = xlsx.utils.sheet_to_json(worksheet, {
        defval: null,
        raw: isCsvFile,
        cellDates: true,
      });

      if (!rows.length) {
        return res.status(400).json({
          error: "El archivo no contiene registros para analizar.",
        });
      }

      const columnMapping = buildColumnMapping(headers);
      const normalizedRows = normalizeRows(rows, columnMapping);
      const sourceFormat = fileExtension.replace(".", "").toUpperCase();

      return res.json({
        sheetName,
        sourceFormat,
        data: normalizedRows,
      });
    } catch (error) {
      next(error);
    }
  });
});

app.get("/api/template", (req, res) => {
  try {
    const rows = [
      { Fecha: "2024-01-01", Consumo: 45.5 },
      { Fecha: "2024-01-02", Consumo: 38.2 },
      { Fecha: "2024-01-03", Consumo: 41.9 },
    ];

    const requestedFormat = String(req.query.format || "xlsx").toLowerCase();

    if (requestedFormat === "csv") {
      const worksheet = xlsx.utils.json_to_sheet(rows);
      const csv = xlsx.utils.sheet_to_csv(worksheet);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=plantilla_datos.csv",
      );
      res.send(`\ufeff${csv}`);
      return;
    }

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Plantilla");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

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

app.get("/health", (req, res) => res.sendStatus(200));

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
