import React, { forwardRef } from "react"

const TreasuryTimeline = forwardRef(({ data, loading }, ref) => (
  <div className="treasury-timeline" ref={ref}>
    <h3>Timeline financière</h3>
    {loading ? (
      <div className="loading-state">
        <div className="spinner" />
        <p>Chargement…</p>
      </div>
    ) : data.length === 0 ? (
      <div className="empty-state small">
        <p>Aucune donnée pour la période sélectionnée.</p>
      </div>
    ) : (
      <div className="timeline-track">
        {data.map((item) => (
          <div className="timeline-node" key={item.key}>
            <div
              className="timeline-dot"
              data-tooltip={`Cotisations : ${item.cotisations.toFixed(2)} €\nPaiements : ${item.paiements.toFixed(2)} €\nDépenses : ${item.depenses.toFixed(2)} €`}
            />
            <span className="timeline-label">{item.label}</span>
          </div>
        ))}
      </div>
    )}
  </div>
))

export default TreasuryTimeline






