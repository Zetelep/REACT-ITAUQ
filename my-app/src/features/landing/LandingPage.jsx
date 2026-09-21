import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../app/providers/AuthProvider'
import './LandingPage.css'

// The instrument's own structure is the page's visual material.
const CATEGORIES = [
  'Attractiveness',
  'Efficiency',
  'Dependability',
  'Stimulation',
  'Trust',
  'Novelty',
  'User Satisfaction',
  'Accessibility',
  'Social Interaction',
  'Learnability',
]

const LandingPage = () => {
  const { session } = useAuth()

  return (
    <div className="landing">
      <header className="landing__bar">
        <img src="/icon.png" alt="" width="30" height="30" className="landing__mark" />
        <span className="landing__wordmark">ITAUQ</span>
        <span className="landing__bar-note" lang="en">Indonesian Tourism Application Usability Questionnaire</span>
      </header>

      <main className="landing__stage">
        <div className="landing__lede">
          <h1 className="landing__title">
            Instrumen usability untuk aplikasi pariwisata Indonesia.
          </h1>
          <p className="landing__sub">
            ITAUQ menyatukan kuesioner 30 butir pada sepuluh kategori dengan skenario tugas bertimer.
            Siapkan instrumennya, sebarkan tautannya, lalu baca skor per kategori dan tingkat
            keberhasilan tiap tugas, semuanya dihitung otomatis.
          </p>
          <div className="landing__actions">
            <Link to={session ? '/admin/dashboard' : '/admin'} className="landing__btn">
              {session ? 'Buka dashboard' : 'Masuk sebagai administrator'}
            </Link>
          </div>
          <p className="landing__note">
            Belum punya akun? Ajukan akses dari halaman masuk. Responden tidak perlu login, cukup
            membuka tautan evaluasi yang mereka terima.
          </p>
        </div>

        <section className="landing__instrument" aria-labelledby="instrument-heading">
          <h2 className="landing__instrument-title" id="instrument-heading">Isi instrumen</h2>
          <dl className="landing__spec">
            <div><dt>Butir ITAUQ</dt><dd>30</dd></div>
            <div><dt>Kategori</dt><dd>10</dd></div>
            <div><dt>Skala ITAUQ</dt><dd>1–7</dd></div>
          </dl>
          <ol className="landing__categories" lang="en">
            {CATEGORIES.map((category) => (
              <li key={category}>{category}</li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  )
}

export default LandingPage
