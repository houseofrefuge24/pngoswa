import Image from "next/image"
import Link from "next/link"

import { UserPlusIcon } from "./icons"

export function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-grid container">
        <div className="anim-rise">
          <span className="section-label">Est. 2024 - Philippines</span>
          <div className="hero-banner">
            <p className="hero-kicker">
              Philippine NGO Social Workers Association
            </p>
            <h1 className="hero-title">
              One National Banner for{" "}
              <span className="gradient-text">NGO Social Workers</span>
            </h1>
          </div>
          <p className="hero-desc">
            Building one strong voice for advocacy, professional growth, and
            shared social impact.
          </p>
          <div className="hero-banner-tags" aria-label="Core pillars">
            <span>Advocacy</span>
            <span>Professional Growth</span>
            <span>National Collaboration</span>
          </div>
          <div className="hero-actions">
            <Link href="/membership" className="btn btn-cta btn-lg">
              <UserPlusIcon />
              Become a Member
            </Link>
            <a href="#gallery" className="btn btn-outline btn-lg">
              View Gallery
            </a>
          </div>
          <div className="hero-stats">
            <div>
              <p className="hero-stat-val" style={{ color: "var(--navy)" }}>
                2024
              </p>
              <p className="hero-stat-label">Founded</p>
            </div>
            <div>
              <p className="hero-stat-val" style={{ color: "var(--crimson)" }}>
                10+
              </p>
              <p className="hero-stat-label">Core Programs</p>
            </div>
            <div>
              <p className="hero-stat-val" style={{ color: "var(--cyan)" }}>
                PH
              </p>
              <p className="hero-stat-label">Nationwide</p>
            </div>
          </div>
        </div>
        <div className="anim-rise d2">
          <div className="hero-visual-stage">
            <div className="hero-img-wrap">
              <div className="hero-img-orbit hero-img-orbit-one" />
              <div className="hero-img-orbit hero-img-orbit-two" />
              <div className="hero-img-shell">
                <div className="hero-img-seal">
                  <Image
                    src="/logo.jpg"
                    alt="Official PNGOSWA association seal"
                    width={960}
                    height={960}
                    preload
                    sizes="(max-width: 1023px) 72vw, 34vw"
                  />
                </div>
                <div className="hero-img-badge">
                  <span className="hero-img-badge-label">Official Identity</span>
                  <p>
                    One symbol for advocacy, solidarity, and professional
                    service across the Philippines.
                  </p>
                </div>
              </div>
            </div>
            <div className="hero-info-card hero-info-card-top">
              <span className="hero-info-label">National Banner</span>
              <strong>Shared mission, local action.</strong>
            </div>
            <div className="hero-info-card hero-info-card-bottom">
              <span className="hero-info-label">Community Promise</span>
              <strong>Stronger together for every community.</strong>
            </div>
          </div>
        </div>
      </div>
      <div className="gradient-bar" />
    </section>
  )
}
