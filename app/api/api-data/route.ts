/**
 * Sample API endpoint - static JSON data.
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'Here is some sample API data',
    items: ['apple', 'banana', 'cherry'],
  })
}

