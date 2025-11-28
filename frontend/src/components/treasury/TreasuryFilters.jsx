import React from "react"

const TreasuryFilters = ({ filters, onChange, onReset, monthOptions }) => (
  <section className="module-toolbar">
    <div className="toolbar-filters">
      <div className="filter-item">
        <label>Mois</label>
        <select value={filters.periode_mois} onChange={(e) => onChange("periode_mois", e.target.value)}>
          <option value="">Tous</option>
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-item">
        <label>Année</label>
        <input
          type="number"
          min="2020"
          max="2100"
          value={filters.periode_annee}
          onChange={(e) => onChange("periode_annee", e.target.value)}
          placeholder="2025"
        />
      </div>
      <div className="filter-item">
        <label>Statut cotisation</label>
        <select value={filters.statutCotisation} onChange={(e) => onChange("statutCotisation", e.target.value)}>
          <option value="">Tous</option>
          <option value="en_attente">En attente</option>
          <option value="paye">Payé</option>
          <option value="annule">Annulé</option>
        </select>
      </div>
      <div className="filter-item">
        <label>Type paiement</label>
        <select value={filters.typePaiement} onChange={(e) => onChange("typePaiement", e.target.value)}>
          <option value="">Tous</option>
          <option value="cotisation">Cotisation</option>
          <option value="don">Don</option>
          <option value="autre">Autre</option>
        </select>
      </div>
      <div className="filter-item">
        <label>Statut paiement</label>
        <select value={filters.statutPaiement} onChange={(e) => onChange("statutPaiement", e.target.value)}>
          <option value="">Tous</option>
          <option value="valide">Validé</option>
          <option value="en_attente">En attente</option>
          <option value="annule">Annulé</option>
        </select>
      </div>
      <div className="filter-item">
        <label>Statut dépense</label>
        <select value={filters.statutDepense} onChange={(e) => onChange("statutDepense", e.target.value)}>
          <option value="">Toutes</option>
          <option value="planifie">Planifiée</option>
          <option value="valide">Validée</option>
          <option value="rejete">Rejetée</option>
        </select>
      </div>
      <div className="filter-item">
        <label>Recherche membre</label>
        <input
          type="text"
          value={filters.memberQuery}
          onChange={(e) => onChange("memberQuery", e.target.value)}
          placeholder="Nom ou numéro"
        />
      </div>
      <button className="btn-secondary" type="button" onClick={onReset}>
        Réinitialiser
      </button>
    </div>
  </section>
)

export default TreasuryFilters











