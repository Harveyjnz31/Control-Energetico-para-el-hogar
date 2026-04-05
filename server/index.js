const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();
const upload = multer();

app.use(cors());

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió el archivo.' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: null, raw: true });

    return res.json({ sheetName, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al procesar el archivo Excel.' });
  }
});

app.listen(4000, () => {
  console.log('Servidor backend iniciado en http://localhost:4000');
});