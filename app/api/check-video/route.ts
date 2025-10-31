import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing prediction ID' },
        { status: 400 }
      )
    }

    // Demo mode: Simulate processing then return a sample video
    // In production, check Replicate prediction status:
    // const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
    // const prediction = await replicate.predictions.get(id)
    // return NextResponse.json({
    //   status: prediction.status,
    //   videoUrl: prediction.output
    // })

    // For demo, return sample video after 5 seconds
    if (id.startsWith('mock_')) {
      const timestamp = parseInt(id.split('_')[1])
      const elapsed = Date.now() - timestamp

      if (elapsed > 5000) {
        // Return a sample video URL (using a public domain video)
        return NextResponse.json({
          status: 'succeeded',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        })
      } else {
        return NextResponse.json({
          status: 'processing'
        })
      }
    }

    return NextResponse.json({
      status: 'processing'
    })
  } catch (error) {
    console.error('Error checking video status:', error)
    return NextResponse.json(
      { error: 'Failed to check video status' },
      { status: 500 }
    )
  }
}
