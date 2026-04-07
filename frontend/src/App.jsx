import { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

const REQUIRED_COLUMNS = ["Fecha", "Consumo"];
const ACCEPTED_FILE_TYPES =
  ".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const numberFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 2,
});

const shortDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
});

const fullDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
});

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename = "") {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.at(-1).toUpperCase() : "ARCHIVO";
}

function parseConsumption(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  let normalizedValue = trimmedValue.replace(/\s+/g, "");
  const lastComma = normalizedValue.lastIndexOf(",");
  const lastDot = normalizedValue.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalizedValue = normalizedValue.replace(/\./g, "").replace(",", ".");
    } else {
      normalizedValue = normalizedValue.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    normalizedValue = normalizedValue.replace(",", ".");
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsedValue = new Date(excelEpoch.getTime() + value * 86400000);
    return Number.isNaN(parsedValue.getTime())
      ? null
      : new Date(
          parsedValue.getUTCFullYear(),
          parsedValue.getUTCMonth(),
          parsedValue.getUTCDate(),
        );
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const isoMatch = trimmedValue.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const latinMatch = trimmedValue.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (latinMatch) {
    const [, day, month, year] = latinMatch;
    const normalizedYear =
      year.length === 2 ? Number(`20${year}`) : Number(year);
    return new Date(normalizedYear, Number(month) - 1, Number(day));
  }

  const parsedValue = new Date(trimmedValue);
  return Number.isNaN(parsedValue.getTime())
    ? null
    : new Date(
        parsedValue.getFullYear(),
        parsedValue.getMonth(),
        parsedValue.getDate(),
      );
}

function formatConsumption(value) {
  return `${numberFormatter.format(value)} kWh`;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip__label">{label}</span>
      <strong className="chart-tooltip__value">
        {formatConsumption(payload[0].value)}
      </strong>
    </div>
  );
}

function App() {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadMeta, setUploadMeta] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] ?? null;

    setFile(selectedFile);
    setError("");
    setSuccessMessage("");
    setData([]);
    setUploadMeta(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Selecciona un archivo antes de iniciar el analisis.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "No se pudo procesar el archivo.");
      }

      setData(result.data ?? []);
      setUploadMeta({
        rows: result.data?.length ?? 0,
        sheetName: result.sheetName || "Principal",
        sourceFormat: result.sourceFormat || getFileExtension(file.name),
        fileName: file.name,
      });
      setSuccessMessage(
        `Se importaron ${result.data?.length ?? 0} registros desde ${file.name}.`,
      );
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setData([]);
    setError("");
    setSuccessMessage("");
    setUploadMeta(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const analytics = useMemo(() => {
    if (!data.length) {
      return null;
    }

    const normalizedRows = data
      .map((row) => {
        const parsedDate = parseDateValue(row.Fecha);
        const parsedConsumption = parseConsumption(row.Consumo);

        if (!parsedDate || parsedConsumption === null) {
          return null;
        }

        const monthDate = new Date(
          parsedDate.getFullYear(),
          parsedDate.getMonth(),
          1,
        );

        return {
          ...row,
          rawDate: parsedDate,
          monthDate,
          sortTime: parsedDate.getTime(),
          fechaCompleta: fullDateFormatter.format(parsedDate),
          fechaCorta: shortDateFormatter.format(parsedDate),
          consumo: parsedConsumption,
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.sortTime - right.sortTime);

    if (!normalizedRows.length) {
      return null;
    }

    const monthlyMap = normalizedRows.reduce((accumulator, row) => {
      const monthKey = row.monthDate.getTime();

      if (!accumulator[monthKey]) {
        accumulator[monthKey] = {
          monthDate: row.monthDate,
          mes: monthFormatter.format(row.monthDate),
          consumo: 0,
        };
      }

      accumulator[monthKey].consumo += row.consumo;
      return accumulator;
    }, {});

    const monthlyData = Object.values(monthlyMap)
      .sort((left, right) => left.monthDate - right.monthDate)
      .map((item) => ({
        ...item,
        consumo: Number(item.consumo.toFixed(2)),
      }));

    const totalConsumo = normalizedRows.reduce(
      (accumulator, row) => accumulator + row.consumo,
      0,
    );
    const averageConsumo = totalConsumo / normalizedRows.length;
    const peakDay = [...normalizedRows].sort(
      (left, right) => right.consumo - left.consumo,
    )[0];
    const peakMonth = [...monthlyData].sort(
      (left, right) => right.consumo - left.consumo,
    )[0];
    const topDays = [...normalizedRows]
      .sort((left, right) => right.consumo - left.consumo)
      .slice(0, 5);

    return {
      totalConsumo,
      averageConsumo,
      totalDays: normalizedRows.length,
      rangeStart: normalizedRows[0].fechaCompleta,
      rangeEnd: normalizedRows.at(-1).fechaCompleta,
      peakDay,
      peakMonth,
      topDays,
      dailyData: normalizedRows.map((row) => ({
        fecha: row.fechaCorta,
        fechaCompleta: row.fechaCompleta,
        consumo: Number(row.consumo.toFixed(2)),
      })),
      monthlyData,
    };
  }, [data]);

  const sourceFormatLabel = uploadMeta?.sourceFormat || "CSV / XLSX";
  const sourceFileName = uploadMeta?.fileName || "Sin archivo seleccionado";
  const rowsCount = uploadMeta?.rows || 0;

  return (
    <div className="app-shell">
      <div className="app-shell__glow app-shell__glow--left" />
      <div className="app-shell__glow app-shell__glow--right" />

      <main className="dashboard">
        <section className="hero-card">
          <div className="hero-copy">
            <span className="eyebrow">Control energetico del hogar</span>
            <h1>
              Convierte tus archivos de consumo en un tablero claro, elegante y
              accionable.
            </h1>
            <p className="hero-copy__lead">
              Sube reportes en Excel o CSV, valida columnas clave y obtén una
              lectura visual de los picos, tendencias y registros diarios sin
              pasar por hojas manuales.
            </p>

            <div className="hero-chips">
              <span className="chip">Formatos: CSV, XLSX y XLS</span>
              <span className="chip">Columnas requeridas: Fecha y Consumo</span>
              <span className="chip">Analisis inmediato hasta 5 MB</span>
            </div>

            <div className="hero-feature-grid">
              <article className="hero-feature">
                <span className="hero-feature__kicker">Lectura rapida</span>
                <strong>Totales, promedios y dias criticos</strong>
                <p>
                  La vista principal resume lo importante antes de entrar al
                  detalle.
                </p>
              </article>

              <article className="hero-feature">
                <span className="hero-feature__kicker">Carga flexible</span>
                <strong>Mismo flujo para CSV y Excel</strong>
                <p>
                  Puedes trabajar con exportaciones simples o archivos de hoja
                  de calculo.
                </p>
              </article>
            </div>
          </div>

          <aside className="upload-panel">
            <div className="upload-panel__header">
              <span className="eyebrow eyebrow--warm">Carga del archivo</span>
              <h2>Analiza un nuevo consumo</h2>
              <p>
                Selecciona un archivo con las columnas requeridas y genera el
                tablero al instante.
              </p>
            </div>

            <label
              className={`dropzone ${file ? "dropzone--active" : ""} ${
                loading ? "dropzone--disabled" : ""
              }`}
            >
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileChange}
                disabled={loading}
              />

              <span className="dropzone__badge">
                {file ? getFileExtension(file.name) : "CSV / XLSX"}
              </span>
              <strong className="dropzone__title">
                {file ? file.name : "Selecciona o arrastra tu archivo"}
              </strong>
              <span className="dropzone__meta">
                {file
                  ? `${formatFileSize(file.size)} · listo para procesar`
                  : "Soporta .csv, .xlsx y .xls"}
              </span>
            </label>

            <div className="panel-actions">
              <button
                className="button button--primary"
                onClick={handleUpload}
                disabled={loading || !file}
              >
                {loading ? "Procesando..." : "Analizar archivo"}
              </button>

              <button
                className="button button--ghost"
                onClick={handleClear}
                disabled={loading && !file}
              >
                Limpiar
              </button>
            </div>

            <div className="template-links">
              <a href="/api/template">Plantilla XLSX</a>
              <a href="/api/template?format=csv">Plantilla CSV</a>
            </div>

            <div className="file-brief">
              <div>
                <span className="file-brief__label">Formato</span>
                <strong>{sourceFormatLabel}</strong>
              </div>
              <div>
                <span className="file-brief__label">Archivo</span>
                <strong>{sourceFileName}</strong>
              </div>
              <div>
                <span className="file-brief__label">Filas cargadas</span>
                <strong>{rowsCount}</strong>
              </div>
            </div>

            {successMessage && (
              <div className="status status--success">{successMessage}</div>
            )}
            {error && <div className="status status--error">{error}</div>}
          </aside>
        </section>

        {analytics ? (
          <>
            <section className="metrics-grid">
              <article className="metric-card metric-card--highlight">
                <span className="metric-card__label">Consumo total</span>
                <strong>{formatConsumption(analytics.totalConsumo)}</strong>
                <p>Acumulado de todos los registros analizados.</p>
              </article>

              <article className="metric-card">
                <span className="metric-card__label">Promedio diario</span>
                <strong>{formatConsumption(analytics.averageConsumo)}</strong>
                <p>Media simple sobre {analytics.totalDays} dias validos.</p>
              </article>

              <article className="metric-card">
                <span className="metric-card__label">Periodo cubierto</span>
                <strong>{analytics.totalDays} dias</strong>
                <p>
                  Desde {analytics.rangeStart} hasta {analytics.rangeEnd}.
                </p>
              </article>

              <article className="metric-card">
                <span className="metric-card__label">Mes mas exigente</span>
                <strong>{formatConsumption(analytics.peakMonth.consumo)}</strong>
                <p>{analytics.peakMonth.mes}</p>
              </article>
            </section>

            <section className="insights-layout">
              <article className="panel panel--wide">
                <div className="panel__header">
                  <div>
                    <span className="eyebrow">Vista mensual</span>
                    <h2>Tendencia del consumo por mes</h2>
                  </div>
                  <p>
                    Ideal para detectar temporadas de mayor demanda y comparar
                    periodos de forma rapida.
                  </p>
                </div>

                <div className="chart-shell">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.monthlyData}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="mes"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={12} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="consumo"
                        fill="#1e847f"
                        radius={[14, 14, 0, 0]}
                        maxBarSize={52}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="panel">
                <div className="panel__header">
                  <div>
                    <span className="eyebrow">Picos detectados</span>
                    <h2>Momentos a vigilar</h2>
                  </div>
                  <p>Los dias de mayor carga ayudan a priorizar acciones.</p>
                </div>

                <ol className="ranking-list">
                  {analytics.topDays.map((day, index) => (
                    <li key={`${day.fechaCompleta}-${index}`}>
                      <span className="ranking-list__index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <strong>{day.fechaCompleta}</strong>
                        <span>{formatConsumption(day.consumo)}</span>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mini-card-grid">
                  <article className="mini-card mini-card--accent">
                    <span>Dia pico</span>
                    <strong>{formatConsumption(analytics.peakDay.consumo)}</strong>
                    <p>{analytics.peakDay.fechaCompleta}</p>
                  </article>

                  <article className="mini-card">
                    <span>Hoja origen</span>
                    <strong>{uploadMeta?.sheetName || "Principal"}</strong>
                    <p>{sourceFormatLabel}</p>
                  </article>
                </div>
              </article>
            </section>

            <section className="insights-layout">
              <article className="panel panel--wide">
                <div className="panel__header">
                  <div>
                    <span className="eyebrow">Vista diaria</span>
                    <h2>Detalle del comportamiento dia a dia</h2>
                  </div>
                  <p>
                    Útil para ubicar variaciones puntuales, cargas anormales y
                    dias con posibles oportunidades de ahorro.
                  </p>
                </div>

                <div className="chart-shell">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.dailyData}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="fecha"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={12} />
                      <Tooltip
                        content={<ChartTooltip />}
                        labelFormatter={(value, payload) =>
                          payload?.[0]?.payload?.fechaCompleta || value
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="consumo"
                        stroke="#f28c28"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: "#f28c28" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="panel">
                <div className="panel__header">
                  <div>
                    <span className="eyebrow">Guia rapida</span>
                    <h2>Para obtener mejores analisis</h2>
                  </div>
                </div>

                <ul className="guidance-list">
                  <li>
                    Usa encabezados consistentes:{" "}
                    <strong>{REQUIRED_COLUMNS.join(" y ")}</strong>.
                  </li>
                  <li>
                    Puedes cargar exportaciones simples en CSV sin convertirlas
                    manualmente.
                  </li>
                  <li>
                    Si recibes un error, revisa que las filas tengan fechas y
                    consumos numericos.
                  </li>
                </ul>
              </article>
            </section>

            <section className="panel">
              <div className="panel__header panel__header--split">
                <div>
                  <span className="eyebrow">Vista previa</span>
                  <h2>Primeros registros importados</h2>
                </div>
                <p>
                  Mostrando los primeros 10 registros de un total de{" "}
                  {data.length}.
                </p>
              </div>

              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      {Object.keys(data[0]).map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 10).map((row, rowIndex) => (
                      <tr key={`row-${rowIndex}`}>
                        {Object.entries(row).map(([key, value]) => (
                          <td key={`${key}-${rowIndex}`}>
                            {value !== null ? String(value) : ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="empty-state">
            <span className="eyebrow">Sin datos cargados</span>
            <h2>Sube un archivo para activar el tablero.</h2>
            <p>
              Cuando cargues un CSV o Excel, aqui apareceran las tendencias,
              picos de consumo y la vista previa de registros.
            </p>

            <div className="empty-state__grid">
              <article className="empty-card">
                <strong>CSV o Excel</strong>
                <p>El sistema acepta ambos formatos con el mismo flujo.</p>
              </article>

              <article className="empty-card">
                <strong>Visual inmediato</strong>
                <p>Las graficas se construyen al terminar la carga.</p>
              </article>

              <article className="empty-card">
                <strong>Validacion simple</strong>
                <p>Solo necesitas las columnas Fecha y Consumo.</p>
              </article>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
