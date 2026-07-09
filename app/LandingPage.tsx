'use client'

import { useState } from 'react'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  
  const handleGetStarted = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    window.location.href = '/signup'
  }
  
  return (
    <div className="pageWrap">
      <div className="appShell">
        <div className="hero">
          <div className="heroTop">
            <div className="logo">
              DawrBa<span className="dot"></span>
            </div>
            <div className="pill">Powerful for Small Businesses</div>
          </div>
          
          <h1>Track Credit. Get Paid Faster.</h1>
          <p>The simple solution for managing customer credit and collecting payments automatically. No complex accounting software needed.</p>
          
          <div className="heroActions">
            <a href="/signup" className="btn btnPrimary">Get Started</a>
          </div>
        </div>
        
        <div className="trustBar">
          <div className="stat">
            <strong>50K+</strong>
            <span>Businesses</span>
          </div>
          <div className="stat">
            <strong>$25M+</strong>
            <span>Revenue Generated</span>
          </div>
          <div className="stat">
            <strong>99.9%</strong>
            <span>Uptime</span>
          </div>
        </div>
        
        <div className="section">
          <div className="sectionTitle">
            <h2>How It Works</h2>
            <span>3 Easy Steps</span>
          </div>
          
          <div className="stepsGrid">
            <div className="card stepCard">
              <div className="stepNo">1</div>
              <div>
                <h3>Setup Your Account</h3>
                <p>Create your free DawrBa account in seconds. No credit card required.</p>
              </div>
            </div>
            
            <div className="card stepCard">
              <div className="stepNo">2</div>
              <div>
                <h3>Add Your Customers</h3>
                <p>Import your customer list and set up their credit limits and preferences.</p>
              </div>
            </div>
            
            <div className="card stepCard">
              <div className="stepNo">3</div>
              <div>
                <h3>Track & Collect</h3>
                <p>Automatically track credit usage and send payment reminders. Get paid, hassle-free.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="featuresGrid">
          <div className="card featureCard">
            <i className="fa-solid fa-users"></i>
            <h3>Customer Management</h3>
            <p>Keep track of customer balances with automatic calculations.</p>
          </div>
          
          <div className="card featureCard">
            <i className="fa-solid fa-credit-card"></i>
            <h3>Smart Payments</h3>
            <p>Record payments and credit adjustments in a single tap.</p>
          </div>
          
          <div className="card featureCard">
            <i className="fa-solid fa-chart-pie"></i>
            <h3>Financial Insights</h3>
            <p>Get clear visibility into your cash flow and outstanding receivables.</p>
          </div>
          
          <div className="card featureCard">
            <i className="fa-solid fa-mobile-screen"></i>
            <h3>Mobile Optimized</h3>
            <p>Works perfectly on any device - desktop, tablet or mobile.</p>
          </div>
        </div>
        
        <div className="ctaBox">
          <h3>Ready to simplify your invoicing?</h3>
          <p>Join thousands of small business owners who trust DawrBa to streamline their finance management.</p>
          <a href="/signup" className="btn btnPrimary">Start Your Free Trial</a>
        </div>
        
        <div className="footer">
          <p>© 2026 DawrBa. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}