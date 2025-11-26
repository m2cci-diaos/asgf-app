import React from 'react'

export function BureauStyles() {
  return (
    <style>{`
      .bureau-section {
        padding: 120px 0 80px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        min-height: 100vh;
      }
      .section-intro {
        text-align: center;
        max-width: 900px;
        margin: 0 auto 4rem;
        padding: 0 2rem;
      }
      .section-intro h1 {
        font-size: 2.8rem;
        color: var(--dark-color);
        margin-bottom: 1rem;
        font-weight: bold;
      }
      .section-intro .subtitle {
        font-size: 1.3rem;
        color: white;
        background: var(--gradient);
        padding: 1rem 2rem;
        border-radius: 10px;
        display: inline-block;
        margin-bottom: 1.5rem;
        font-weight: 600;
      }
      .section-intro p {
        font-size: 1.1rem;
        color: #666;
        line-height: 1.8;
      }
      .team-category {
        margin-bottom: 5rem;
      }
      .category-header {
        text-align: left;
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: white;
        border-radius: 15px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        border-left: 5px solid var(--primary-color);
      }
      .category-header h2 {
        color: var(--primary-color);
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }
      .category-header p {
        color: #666;
        font-size: 1.1rem;
      }
      .bureau-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2rem;
      }
      .member-card {
        background: white;
        border-radius: 20px;
        padding: 2rem;
        text-align: center;
        box-shadow: 0 15px 35px rgba(0,0,0,0.1);
        transition: all 0.4s ease;
        position: relative;
        overflow: hidden;
      }
      .member-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--gradient);
        transform: scaleX(0);
        transition: transform 0.3s ease;
      }
      .member-card:hover::before {
        transform: scaleX(1);
      }
      .member-card:hover {
        transform: translateY(-10px);
        box-shadow: 0 25px 50px rgba(0,0,0,0.15);
      }
      .member-photo {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        margin: 0 auto 1.5rem;
        position: relative;
        overflow: hidden;
        border: 4px solid var(--primary-color);
        transition: all 0.3s ease;
        background: #f0f0f0;
      }
      .member-card:hover .member-photo {
        border-color: var(--secondary-color);
        transform: scale(1.05);
      }
      .member-photo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
        transition: transform 0.3s ease;
      }
      .member-card:hover .member-photo img {
        transform: scale(1.1);
      }
      .photo-placeholder {
        width: 100%;
        height: 100%;
        background: var(--gradient);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 3rem;
      }
      .member-name {
        font-size: 1.4rem;
        font-weight: bold;
        color: black;
        margin-bottom: 0.5rem;
      }
      .member-role {
        font-size: 1rem;
        color: var(--primary-color);
        font-weight: 600;
        margin-bottom: 1rem;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .member-contact {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-top: 1rem;
      }
      .contact-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: var(--gradient);
        color: white;
        border-radius: 50%;
        text-decoration: none;
        transition: all 0.3s ease;
        font-size: 1.1rem;
      }
      .contact-link:hover {
        transform: translateY(-3px) scale(1.1);
        box-shadow: 0 8px 20px rgba(0, 102, 204, 0.3);
      }
      .contact-link.email:hover {
        background: #ea4335;
      }
      .contact-link.linkedin:hover {
        background: #0077b5;
      }
      .contact-link.phone:hover {
        background: var(--secondary-color);
      }
      .president-card {
        border: 3px solid var(--accent-color);
        position: relative;
      }
      .president-badge {
        position: absolute;
        top: -10px;
        right: 20px;
        background: var(--accent-color);
        color: var(--dark-color);
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-weight: bold;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        box-shadow: 0 4px 10px rgba(253, 203, 110, 0.4);
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .member-card:hover .president-badge {
        animation: pulse 1s infinite;
      }
      .fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s ease;
      }
      .fade-in.visible {
        opacity: 1;
        transform: translateY(0);
      }
      @media (max-width: 768px) {
        .section-intro h1 {
          font-size: 2rem;
        }
        .section-intro .subtitle {
          font-size: 1.1rem;
          padding: 0.8rem 1.5rem;
        }
        .bureau-grid {
          grid-template-columns: 1fr;
        }
        .category-header h2 {
          font-size: 1.5rem;
        }
      }
    `}</style>
  )
}

export function FormationStyles() {
  return (
    <style>{`
      .formations-section {
        padding: 120px 0 80px;
        background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
        min-height: 100vh;
      }
      .formations-header {
        text-align: center;
        margin-bottom: 4rem;
        padding: 0 2rem;
      }
      .formations-header h1 {
        font-size: 3rem;
        color: #1a1a1a;
        margin-bottom: 1rem;
        font-weight: bold;
      }
      .formations-header .subtitle {
        font-size: 1.3rem;
        color: white;
        background: var(--gradient);
        padding: 1rem 2rem;
        border-radius: 10px;
        display: inline-block;
        margin-bottom: 1.5rem;
        font-weight: 600;
      }
      .formations-header p {
        font-size: 1.2rem;
        color: #666;
        max-width: 800px;
        margin: 0 auto;
        line-height: 1.8;
      }
      .stats-banner {
        background: var(--gradient);
        color: white;
        padding: 3rem 2rem;
        border-radius: 20px;
        margin-bottom: 3rem;
        text-align: center;
      }
      .stats-banner h2 {
        margin-bottom: 2rem;
        font-size: 2rem;
        color: white;
        font-weight: bold;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 2rem;
      }
      .stat-item {
        text-align: center;
      }
      .stat-number {
        font-size: 3rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
      }
      .stat-label {
        font-size: 1rem;
        opacity: 0.9;
      }
      .filter-tabs {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 3rem;
        flex-wrap: wrap;
      }
      .filter-tab {
        padding: 0.8rem 2rem;
        background: white;
        border: 2px solid var(--primary-color);
        color: var(--primary-color);
        border-radius: 50px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
        font-size: 1rem;
      }
      .filter-tab:hover,
      .filter-tab.active {
        background: var(--gradient);
        color: white;
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 102, 204, 0.3);
      }
      .formations-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 2rem;
        margin-bottom: 3rem;
      }
      .formation-card {
        background: white;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
      }
      .formation-card:hover {
        transform: translateY(-10px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      }
      .formation-image {
        width: 100%;
        height: 200px;
        background: var(--gradient);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 4rem;
        position: relative;
        overflow: hidden;
      }
      .formation-image i {
        position: relative;
        z-index: 1;
      }
      .formation-badge {
        position: absolute;
        top: 15px;
        right: 15px;
        background: var(--accent-color);
        color: var(--dark-color);
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-weight: bold;
        font-size: 0.85rem;
        z-index: 2;
      }
      .formation-content {
        padding: 2rem;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
      }
      .formation-category {
        display: inline-block;
        background: rgba(0, 102, 204, 0.1);
        color: var(--primary-color);
        padding: 0.3rem 0.8rem;
        border-radius: 15px;
        font-size: 0.85rem;
        font-weight: 600;
        margin-bottom: 1rem;
      }
      .formation-title {
        font-size: 1.5rem;
        font-weight: bold;
        color: #1a1a1a;
        margin-bottom: 1rem;
        line-height: 1.3;
      }
      .formation-description {
        color: #666;
        line-height: 1.6;
        margin-bottom: 1.5rem;
        flex-grow: 1;
      }
      .formation-details {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid #eee;
      }
      .formation-detail {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #666;
        font-size: 0.9rem;
      }
      .formation-detail i {
        color: var(--primary-color);
      }
      .formation-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: auto;
        padding-top: 1rem;
        border-top: 1px solid #eee;
      }
      .formation-level {
        display: flex;
        gap: 0.3rem;
      }
      .level-badge {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ddd;
      }
      .level-badge.active {
        background: var(--primary-color);
      }
      .formation-btn {
        background: var(--gradient);
        color: white;
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 25px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        display: inline-block;
      }
      .formation-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 102, 204, 0.3);
      }
      .formation-btn.secondary {
        background: transparent;
        border: 2px solid var(--primary-color);
        color: var(--primary-color);
      }
      .formation-btn.secondary:hover {
        background: var(--primary-color);
        color: white;
      }
      .cta-section {
        text-align: center;
        padding: 3rem 2rem;
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      }
      .cta-section h2 {
        color: #1a1a1a;
        font-weight: bold;
        font-size: 2rem;
        margin-bottom: 1rem;
      }
      .cta-section p {
        color: #666;
        font-size: 1.1rem;
        margin-bottom: 1.5rem;
      }
      .fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s ease;
      }
      .fade-in.visible {
        opacity: 1;
        transform: translateY(0);
      }
      @media (max-width: 768px) {
        .formations-header h1 {
          font-size: 2rem;
        }
        .formations-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  )
}

export function AdhesionStyles() {
  return (
    <style>{`
      .adhesion-section {
        padding: 120px 0 80px;
        background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
        min-height: 100vh;
      }
      .adhesion-container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
        padding: 3rem;
        border-radius: 20px;
        box-shadow: 0 15px 35px rgba(0,0,0,0.1);
      }
      .adhesion-header {
        text-align: center;
        margin-bottom: 2rem;
      }
      .adhesion-header h1 {
        color: var(--primary-color);
        margin-bottom: 1rem;
        font-size: 2.5rem;
        font-weight: 700;
      }
      .adhesion-header h1 i {
        color: var(--primary-color);
        margin-right: 0.5rem;
      }
      .adhesion-header p {
        color: #4a4a4a;
        font-size: 1.1rem;
        line-height: 1.7;
        font-weight: 500;
      }
      .form-section {
        margin-bottom: 2rem;
      }
      .form-section h3 {
        color: var(--primary-color);
        margin-bottom: 1.5rem;
        padding-bottom: 0.8rem;
        border-bottom: 2px solid var(--primary-color);
        font-size: 1.3rem;
        font-weight: 700;
      }
      .form-section h3 i {
        color: var(--primary-color);
        margin-right: 0.5rem;
        font-size: 1.2rem;
      }
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .form-group {
        margin-bottom: 1.5rem;
      }
      .form-group label {
        display: block;
        margin-bottom: 0.6rem;
        font-weight: 600;
        color: #2d2d2d;
        font-size: 0.95rem;
      }
      .form-group label .required {
        color: var(--secondary-color);
        margin-left: 0.2rem;
      }
      .form-group input,
      .form-group select,
      .form-group textarea {
        width: 100%;
        padding: 0.9rem 1rem;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 1rem;
        transition: all 0.3s ease;
        background: #ffffff;
        color: #2d2d2d;
        font-weight: 500;
      }
      .form-group input:hover,
      .form-group select:hover,
      .form-group textarea:hover {
        border-color: var(--primary-color);
        background: white;
      }
      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: var(--primary-color);
        background: white;
        box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
      }
      .form-group input.error,
      .form-group select.error,
      .form-group textarea.error {
        border-color: var(--secondary-color);
      }
      .form-group textarea {
        resize: vertical;
        min-height: 120px;
      }
      .error-message {
        color: var(--secondary-color);
        font-size: 0.85rem;
        margin-top: 0.5rem;
        display: block;
      }
      .checkbox-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }
      .checkbox-item {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.8rem;
        background: #f8f9fa;
        border-radius: 8px;
        transition: all 0.3s ease;
      }
      .checkbox-item:hover {
        background: #f0f0f0;
        transform: translateX(3px);
      }
      .checkbox-item input[type="checkbox"] {
        width: 20px;
        height: 20px;
        margin-top: 0.2rem;
        flex-shrink: 0;
        cursor: pointer;
        accent-color: var(--primary-color);
      }
      .checkbox-item label {
        margin: 0;
        font-weight: 500;
        color: #2d2d2d;
        font-size: 0.95rem;
        line-height: 1.5;
        cursor: pointer;
        flex: 1;
      }
      .checkbox-group {
        display: flex;
        align-items: start;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .checkbox-group input[type="checkbox"] {
        width: auto;
        margin-top: 0.3rem;
      }
      .checkbox-group label {
        margin-bottom: 0;
        font-weight: 500;
        color: #2d2d2d;
        font-size: 0.95rem;
        line-height: 1.5;
      }
      .submit-btn {
        background: var(--gradient);
        color: white;
        padding: 1rem 3rem;
        border: none;
        border-radius: 50px;
        font-size: 1.1rem;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        width: 100%;
        margin-top: 1rem;
      }
      .submit-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 102, 204, 0.3);
      }
      .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .benefits-section {
        background: linear-gradient(135deg, rgba(0, 102, 204, 0.05), rgba(0, 82, 163, 0.05));
        padding: 2rem;
        border-radius: 15px;
        margin-bottom: 2rem;
        border: 1px solid rgba(0, 102, 204, 0.15);
      }
      .benefits-section h3 {
        color: var(--primary-color);
        margin-bottom: 1.5rem;
        font-size: 1.3rem;
        font-weight: 700;
      }
      .benefits-section h3 i {
        color: var(--primary-color);
        margin-right: 0.5rem;
      }
      .benefits-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .benefits-list li {
        padding: 0.8rem 0;
        padding-left: 2.5rem;
        position: relative;
        color: #2d2d2d;
        line-height: 1.7;
        font-size: 1rem;
        font-weight: 500;
      }
      .benefits-list li::before {
        content: '✓';
        position: absolute;
        left: 0.5rem;
        color: var(--primary-color);
        font-weight: bold;
        font-size: 1.2rem;
        width: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s ease;
      }
      .fade-in.visible {
        opacity: 1;
        transform: translateY(0);
      }
      @media (max-width: 768px) {
        .adhesion-container {
          padding: 2rem 1.5rem;
        }
        .form-row {
          grid-template-columns: 1fr;
        }
        .adhesion-header h1 {
          font-size: 2rem;
        }
        .checkbox-container {
          grid-template-columns: 1fr;
          gap: 0.8rem;
        }
        .checkbox-item {
          padding: 0.7rem;
        }
      }
    `}</style>
  )
}

export function WebinairesStyles() {
  return (
    <style>{`
      .webinaires-section {
        padding: 120px 0 80px;
        background: #f8f9fa;
      }
      .webinaires-header {
        text-align: center;
        margin-bottom: 4rem;
      }
      .webinaires-header h1 {
        font-size: 3rem;
        color: var(--dark-color);
        margin-bottom: 1rem;
      }
      .webinaires-header p {
        font-size: 1.2rem;
        color: #666;
        max-width: 800px;
        margin: 0 auto;
        line-height: 1.8;
      }
      .webinaires-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 2rem;
        margin-bottom: 3rem;
      }
      .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        color: #999;
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      }
      .empty-state i {
        font-size: 4rem;
        margin-bottom: 1rem;
        color: #ddd;
      }
      .empty-state h3 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        color: #666;
      }
      .empty-state p {
        font-size: 1.1rem;
        color: #999;
      }
      .fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s ease;
      }
      .fade-in.visible {
        opacity: 1;
        transform: translateY(0);
      }
      @media (max-width: 768px) {
        .webinaires-header h1 {
          font-size: 2rem;
        }
        .webinaires-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  )
}
