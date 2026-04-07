import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import "./App.css";

function App() {
  // Estilos constantes para mantener un diseño limpio y profesional
  const styles = {
    container: {
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: "#1a1a1a",
      maxWidth: "900px",
      margin: "40px auto",
      padding: "0 20px",
      lineHeight: "1.6",
    },
    card: {
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      border: "1px solid #e1e4e8",
      padding: "32px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      marginBottom: "32px",
    },
    title: {
      fontSize: "24px",
      fontWeight: "600",
      margin: "0 0 8px 0",
      color: "#091e42",
    },
    subtitle: {
      fontSize: "14px",
      color: "#626f86",
      marginBottom: "24px",
    },
    button: (isLoading, disabled) => ({
      backgroundColor: isLoading || disabled ? "#ebecf0" : "#0052cc",
      color: isLoading || disabled ? "#a5adba" : "#ffffff",
      border: "none",
      borderRadius: "3px",
      padding: "10px 24px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: isLoading || disabled ? "not-allowed" : "pointer",
      transition: "background-color 0.2s",
    }),
    insightCard: {
      flex: "1",
      minWidth: "200px",
      padding: "24px",
      backgroundColor: "#ffffff",
      borderRadius: "4px",
      textAlign: "center",
      border: "1px solid #e1e4e8",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    },
    secondaryButton: {
      backgroundColor: "transparent",
      color: "#0052cc",
      border: "1px solid #0052cc",
      borderRadius: "3px",
      padding: "9px 23px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      transition: "all 0.2s",
    },
    success: {
      backgroundColor: "#e3fcef",
      color: "#006644",
      padding: "12px",
      borderRadius: "3px",
      fontSize: "14px",
      marginTop: "16px",
      borderLeft: "4px solid #36b37e",
    },
    error: {
      backgroundColor: "#ffebe6",
      color: "#bf2600",
      padding: "12px",
      borderRadius: "3px",
      fontSize: "14px",
      marginTop: "16px",
      borderLeft: "4px solid #de350b",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: "16px",
      fontSize: "14px",
    },
    th: {
      backgroundColor: "#f4f5f7",
      color: "#44546f",
      fontWeight: "600",
      textAlign: "left",
      padding: "12px",
      borderBottom: "2px solid #e1e4e8",
    },
    td: {
      padding: "12px",
      borderBottom: "1px solid #e1e4e8",
      color: "#172b4d",
    },
  };

  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
    setData([]);
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Selecciona un archivo primero");
      return;
    }

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error en el servidor");

      setData(result.data);
      setSuccess(true);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setData([]);
    setError(null);
    setSuccess(false);
  };

  // Procesamiento de datos para las gráficas
  const analytics = useMemo(() => {
    if (!data.length) return null;

    const dailyData = data
      .map((d) => ({
        fecha: d.Fecha,
        consumo: Number(d.Consumo),
        rawDate: new Date(d.Fecha),
      }))
      .sort((a, b) => a.rawDate - b.rawDate);

    const monthlyMap = {};
    dailyData.forEach((d) => {
      const month = d.rawDate.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      monthlyMap[month] = (monthlyMap[month] || 0) + d.consumo;
    });

    const monthlyData = Object.keys(monthlyMap).map((m) => ({
      mes: m,
      consumo: Number(monthlyMap[m].toFixed(2)),
    }));

    const peakDay = [...dailyData].sort((a, b) => b.consumo - a.consumo)[0];
    const peakMonth = [...monthlyData].sort((a, b) => b.consumo - a.consumo)[0];
    const topDays = [...dailyData]
      .sort((a, b) => b.consumo - a.consumo)
      .slice(0, 5);

    const totalConsumo = monthlyData.reduce(
      (acc, curr) => acc + curr.consumo,
      0,
    );

    return {
      dailyData,
      monthlyData,
      peakDay,
      peakMonth,
      topDays,
      totalConsumo,
    };
  }, [data]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Gestión de Datos</h1>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <p style={styles.subtitle}>
            Cargue el registro de consumo eléctrico. Requerido: columnas{" "}
            <strong>Fecha</strong> y <strong>Consumo</strong>.
          </p>
          <a href="/api/template" style={styles.secondaryButton}>
            Descargar Plantilla
          </a>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            disabled={loading}
            style={{ fontSize: "14px" }}
          />

          <button
            onClick={handleUpload}
            disabled={loading || !file}
            style={styles.button(loading, !file)}
          >
            {loading ? "Procesando..." : "Cargar Archivo"}
          </button>
        </div>

        {success && (
          <div style={styles.success}>Archivo procesado correctamente.</div>
        )}
        {error && <div style={styles.error}>{error}</div>}
      </div>

      {analytics && (
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginBottom: "32px",
              flexWrap: "wrap",
            }}
          >
            <div style={styles.insightCard}>
              <span
                style={{
                  ...styles.subtitle,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Consumo Total
              </span>
              <div
                style={{ ...styles.title, color: "#0052cc", marginTop: "8px" }}
              >
                {analytics.totalConsumo.toFixed(2)} kWh
              </div>
            </div>

            <div style={styles.insightCard}>
              <span
                style={{
                  ...styles.subtitle,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Promedio Diario
              </span>
              <div
                style={{ ...styles.title, color: "#0052cc", marginTop: "8px" }}
              >
                {(analytics.totalConsumo / analytics.dailyData.length).toFixed(
                  2,
                )}{" "}
                kWh
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            <div style={styles.card}>
              <h3
                style={{
                  ...styles.subtitle,
                  fontSize: "16px",
                  marginBottom: "16px",
                }}
              >
                Top 5 Días de Mayor Consumo
              </h3>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  fontSize: "14px",
                }}
              >
                {analytics.topDays.map((day, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: i < 4 ? "1px solid #f4f5f7" : "none",
                    }}
                  >
                    <span>{day.fecha}</span>
                    <span style={{ fontWeight: "600", color: "#de350b" }}>
                      {day.consumo} kWh
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={styles.card}>
              <span
                style={{
                  ...styles.subtitle,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Mes Pico
              </span>
              <div
                style={{ ...styles.title, color: "#0052cc", marginTop: "8px" }}
              >
                {analytics.peakMonth.consumo} kWh
              </div>
              <span style={{ fontSize: "12px", color: "#626f86" }}>
                {analytics.peakMonth.mes}
              </span>
            </div>
            <div style={styles.card}>
              <span
                style={{
                  ...styles.subtitle,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Día Pico
              </span>
              <div
                style={{ ...styles.title, color: "#de350b", marginTop: "8px" }}
              >
                {analytics.peakDay.consumo} kWh
              </div>
              <span style={{ fontSize: "12px", color: "#626f86" }}>
                {new Date(analytics.peakDay.fecha).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={{ ...styles.title, fontSize: "18px" }}>
              Tendencia Mensual
            </h2>
            <div style={{ width: "100%", height: 300, marginTop: "24px" }}>
              <ResponsiveContainer>
                <BarChart data={analytics.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "#f4f5f7" }} />
                  <Bar dataKey="consumo" fill="#0052cc" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={{ ...styles.title, fontSize: "18px" }}>
              Detalle Diario
            </h2>
            <div style={{ width: "100%", height: 300, marginTop: "24px" }}>
              <ResponsiveContainer>
                <LineChart data={analytics.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="fecha"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="consumo"
                    stroke="#0052cc"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div style={styles.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <h2 style={{ ...styles.title, fontSize: "18px", margin: 0 }}>
                Vista previa de importación
              </h2>
              <p style={{ ...styles.subtitle, margin: 0 }}>
                Mostrando los primeros 10 registros de un total de {data.length}
                .
              </p>
            </div>
            <button
              onClick={handleClear}
              style={{
                ...styles.secondaryButton,
                padding: "6px 16px",
                color: "#626f86",
                borderColor: "#e1e4e8",
              }}
            >
              Limpiar
            </button>
          </div>

          <div style={{ overflowX: "auto", maxWidth: "100%" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key} style={styles.th}>
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={styles.td}>
                        {val !== null ? String(val) : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
