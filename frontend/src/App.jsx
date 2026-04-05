import { useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);

  const handleUpload = async () => {
    if (!file) {
      alert("Selecciona un archivo primero");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:4000/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      setData(result.data);
    } catch (error) {
      console.error(error);
      alert("Error al subir archivo");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Subir Excel 🚀</h1>

      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br />
      <br />

      <button onClick={handleUpload}>Subir archivo</button>

      <h2>Datos:</h2>

      {/* <pre style={{ textAlign: "left", maxHeight: "400px", overflow: "auto" }}>
        {JSON.stringify(data, null, 2)}
      </pre>*/}
    </div>
  );
}

export default App;
