import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const id = searchParams.get('id')

    // Wenn eine ID angegeben ist, suche nur nach dieser
    if (id) {
      const profession = await prisma.trainingProfession.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          category: true
        }
      })
      return NextResponse.json({ professions: profession ? [profession] : [] })
    }

    // Suche nach Ausbildungsberufen mit Autocomplete
    const professions = await prisma.trainingProfession.findMany({
      where: search ? {
        name: {
          contains: search
        }
      } : {},
      select: {
        id: true,
        name: true,
        category: true
      },
      orderBy: {
        name: 'asc'
      },
      take: 50 // Limitiere auf 50 Ergebnisse für Performance
    })

    return NextResponse.json({ professions })
  } catch (error) {
    console.error('Get training professions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}