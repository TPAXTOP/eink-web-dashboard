/**
 * About Page
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About - E-Paper Dashboard',
}

export default function AboutPage() {
  return (
    <div>
      <h1>About</h1>
      <p>
        This is a simple web app demonstrating how to use Next.js with Vercel. 
        This app shows weather data for Kyiv and USD/UAH exchange rates, 
        optimized for e-paper display.
      </p>
    </div>
  )
}

