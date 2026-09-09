import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthProvider'
import './LandingPage.css'

const LandingPage = () => {
  const { session } = useAuth()

  return (
    <div className="landing">
      <section id="home" className="landing__hero">
        <div className="landing__hero-bg" aria-hidden="true">
          <div className="landing__hero-blob landing__hero-blob--a" />
          <div className="landing__hero-blob landing__hero-blob--b" />
        </div>
        <div className="landing__hero-inner">
          <img src="/icon.png" alt="ITAUQ" className="landing__logo-icon" />
          <span className="landing__brand-name">ITAUQ</span>
          <span className="landing__brand-tagline">Indonesian Tourism Application Usability Questionnaire</span>
          <span className="landing__eyebrow">Academic Precision × Local Context</span>
          <h1 className="landing__hero-title">
            Revolutionizing Indonesian
            <br />
            Tourism Usability Research.
          </h1>
          <p className="landing__hero-sub">
            The first standardized usability framework specifically calibrated for the unique cultural and
            geographical nuances of Indonesian tourism applications.
          </p>
          <div className="landing__hero-actions">
            <Link
              to={session ? '/admin/dashboard' : '/admin'}
              className="landing__btn landing__btn--primary"
            >
              {session ? 'Open Dashboard' : 'Start Creating Questionnaire'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
