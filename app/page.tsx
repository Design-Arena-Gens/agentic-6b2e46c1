'use client'

import { useState } from 'react'

interface VideoResult {
  id: string
  prompt: string
  videoUrl: string | null
  status: 'processing' | 'completed' | 'failed'
  error?: string
}

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [videos, setVideos] = useState<VideoResult[]>([])
  const [activeTab, setActiveTab] = useState<'text-to-video' | 'image-to-video'>('text-to-video')
  const [imageFile, setImageFile] = useState<File | null>(null)

  const generateVideo = async () => {
    if (!prompt.trim()) return

    const newVideo: VideoResult = {
      id: Date.now().toString(),
      prompt,
      videoUrl: null,
      status: 'processing'
    }

    setVideos(prev => [newVideo, ...prev])
    setLoading(true)

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          type: activeTab,
          image: imageFile ? await fileToBase64(imageFile) : null
        }),
      })

      const data = await response.json()

      if (data.error) {
        setVideos(prev => prev.map(v =>
          v.id === newVideo.id
            ? { ...v, status: 'failed', error: data.error }
            : v
        ))
      } else {
        // Poll for result
        pollForVideo(newVideo.id, data.predictionId)
      }
    } catch (error) {
      setVideos(prev => prev.map(v =>
        v.id === newVideo.id
          ? { ...v, status: 'failed', error: 'Failed to generate video' }
          : v
      ))
    } finally {
      setLoading(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const pollForVideo = async (videoId: string, predictionId: string) => {
    const maxAttempts = 60
    let attempts = 0

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setVideos(prev => prev.map(v =>
          v.id === videoId
            ? { ...v, status: 'failed', error: 'Timeout: Video generation took too long' }
            : v
        ))
        return
      }

      try {
        const response = await fetch(`/api/check-video?id=${predictionId}`)
        const data = await response.json()

        if (data.status === 'succeeded' && data.videoUrl) {
          setVideos(prev => prev.map(v =>
            v.id === videoId
              ? { ...v, status: 'completed', videoUrl: data.videoUrl }
              : v
          ))
        } else if (data.status === 'failed') {
          setVideos(prev => prev.map(v =>
            v.id === videoId
              ? { ...v, status: 'failed', error: data.error || 'Video generation failed' }
              : v
          ))
        } else {
          attempts++
          setTimeout(poll, 3000)
        }
      } catch (error) {
        setVideos(prev => prev.map(v =>
          v.id === videoId
            ? { ...v, status: 'failed', error: 'Failed to check video status' }
            : v
        ))
      }
    }

    poll()
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">
            🎬 Video Generation AI
          </h1>
          <p className="text-xl text-gray-200">
            Transform your ideas into videos with AI
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl mb-8">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('text-to-video')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                activeTab === 'text-to-video'
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-white/20 text-gray-200 hover:bg-white/30'
              }`}
            >
              📝 Text to Video
            </button>
            <button
              onClick={() => setActiveTab('image-to-video')}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                activeTab === 'image-to-video'
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-white/20 text-gray-200 hover:bg-white/30'
              }`}
            >
              🖼️ Image to Video
            </button>
          </div>

          {activeTab === 'image-to-video' && (
            <div className="mb-4">
              <label className="block text-white mb-2 font-semibold">
                Upload Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full p-3 rounded-lg bg-white/20 text-white border-2 border-white/30 focus:border-purple-400 focus:outline-none"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-white mb-2 font-semibold">
              {activeTab === 'text-to-video' ? 'Describe your video' : 'Describe the motion'}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === 'text-to-video'
                  ? "E.g., A serene ocean sunset with waves gently rolling onto a sandy beach, golden hour lighting"
                  : "E.g., Camera slowly zooms in, gentle wind blowing, cinematic motion"
              }
              className="w-full p-4 rounded-lg bg-white/20 text-white placeholder-gray-300 border-2 border-white/30 focus:border-purple-400 focus:outline-none min-h-[120px] resize-none"
            />
          </div>

          <button
            onClick={generateVideo}
            disabled={loading || !prompt.trim() || (activeTab === 'image-to-video' && !imageFile)}
            className="w-full py-4 px-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg"
          >
            {loading ? '🎬 Generating...' : '✨ Generate Video'}
          </button>

          <div className="mt-4 text-center text-sm text-gray-300">
            ⚠️ Demo mode: Using mock video generation. Connect your Replicate API key for real generation.
          </div>
        </div>

        <div className="space-y-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-gray-200 font-semibold mb-2">Prompt:</p>
                  <p className="text-white">{video.prompt}</p>
                </div>
                <div>
                  {video.status === 'processing' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-sm font-semibold">
                      <span className="animate-pulse mr-2">⏳</span>
                      Processing
                    </span>
                  )}
                  {video.status === 'completed' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-sm font-semibold">
                      ✅ Completed
                    </span>
                  )}
                  {video.status === 'failed' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-sm font-semibold">
                      ❌ Failed
                    </span>
                  )}
                </div>
              </div>

              {video.status === 'processing' && (
                <div className="mt-4">
                  <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse-slow"></div>
                  </div>
                  <p className="text-gray-300 text-sm mt-2 text-center">
                    Generating your video... This may take 1-2 minutes
                  </p>
                </div>
              )}

              {video.status === 'completed' && video.videoUrl && (
                <div className="mt-4">
                  <video
                    src={video.videoUrl}
                    controls
                    className="w-full rounded-lg shadow-lg"
                  />
                  <a
                    href={video.videoUrl}
                    download
                    className="mt-4 inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    ⬇️ Download Video
                  </a>
                </div>
              )}

              {video.status === 'failed' && video.error && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-300">{video.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {videos.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-300 text-xl">
              🎥 No videos yet. Create your first AI-generated video above!
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
