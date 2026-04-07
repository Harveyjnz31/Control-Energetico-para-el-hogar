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

function ChartTooltip({ active, payload, label, formatConsumption }) {
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

function AnalyticsDashboard({
  analytics,
  data,
  formatConsumption,
  sourceFormatLabel,
  uploadMeta,
}) {
  return (
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
                <Tooltip
                  content={
                    <ChartTooltip formatConsumption={formatConsumption} />
                  }
                />
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
              Util para ubicar variaciones puntuales, cargas anormales y dias
              con posibles oportunidades de ahorro.
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
                  content={
                    <ChartTooltip formatConsumption={formatConsumption} />
                  }
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
              Usa encabezados consistentes: <strong>Fecha y Consumo</strong>.
            </li>
            <li>
              Puedes cargar exportaciones simples en CSV sin convertirlas
              manualmente.
            </li>
            <li>
              Si recibes un error, revisa que las filas tengan fechas y consumos
              numericos.
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
          <p>Mostrando los primeros 10 registros de un total de {data.length}.</p>
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
  );
}

export default AnalyticsDashboard;
