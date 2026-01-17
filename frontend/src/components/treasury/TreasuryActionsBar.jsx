import React, { useState } from "react"

const TreasuryActionsBar = ({ exporting, onExportCsv, onExportPdf, onScrollTimeline }) => {
  const [dataset, setDataset] = useState("cotisations")

  return (
    <div className="treasury-actions-bar">
      <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
        <option value="cotisations">Cotisations filtrées</option>
        <option value="paiements">Paiements filtrés</option>
        <option value="depenses">Dépenses filtrées</option>
      </select>
      <button className="btn-secondary" type="button" disabled={exporting} onClick={() => onExportCsv(dataset)}>
        Exporter CSV
      </button>
      <button className="btn-secondary" type="button" disabled={exporting} onClick={onExportPdf}>
        Exporter PDF
      </button>
      <button className="btn-primary" type="button" onClick={onScrollTimeline}>
        Voir détail par mois
      </button>
    </div>
  )
}

export default TreasuryActionsBar



















