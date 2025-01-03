import { NextResponse } from 'next/server'

// This is a mock database. In a real application, you would use a proper database.
let clients: any[] = []

export async function GET() {
  return NextResponse.json(clients)
}

export async function POST(request: Request) {
  const client = await request.json()
  client.id = Date.now().toString() // Generate a unique ID
  clients.push(client)
  return NextResponse.json(client, { status: 201 })
}

