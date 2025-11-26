import React from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const LINE_COLORS = {
  cotisations: "#38bdf8",
  paiements: "#4ade80",
  depenses: "#f97316",
}

const PIE_COLORS = ["#38bdf8", "#facc15", "#f472b6"]

const formatCurrency = (value = 0) => `${Number(value || 0).toFixed(2)} €`

const TreasuryAnalytics = ({ trendsData, distributionData }) => (
  <div className="treasury-analytics">
    <div className="analytics-card">
      <h3>Évolution mensuelle (EUR)</h3>
      {trendsData.length === 0 ? (
        <div className="empty-state small">
          <p>Aucune donnée sur la période sélectionnée.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trendsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
            <XAxis dataKey="label" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" tickFormatter={(value) => `${value}`} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="cotisations" stroke={LINE_COLORS.cotisations} strokeWidth={2} dot={false} name="Cotisations" />
            <Line type="monotone" dataKey="paiements" stroke={LINE_COLORS.paiements} strokeWidth={2} dot={false} name="Paiements" />
            <Line type="monotone" dataKey="depenses" stroke={LINE_COLORS.depenses} strokeWidth={2} dot={false} name="Dépenses" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>

    <div className="analytics-card">
      <h3>Répartition des cotisations (EUR)</h3>
      {distributionData.every((item) => item.value === 0) ? (
        <div className="empty-state small">
          <p>Aucune cotisation validée sur la période.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={distributionData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} label>
              {distributionData.map((entry, index) => (
                <Cell key={`slice-${entry.name}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  </div>
)

export default TreasuryAnalytics






