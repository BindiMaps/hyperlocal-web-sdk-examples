import { useState } from "react"
import { useCameraStream, useFrameCapture } from "@bindimaps/hyperlocal-react"
import { estimatePosition, type PositionResult } from "@bindimaps/hyperlocal-web-sdk"

type Phase = "idle" | "capturing" | "estimating" | "done" | "error"

export function App() {
    const [phase, setPhase] = useState<Phase>("idle")
    const [result, setResult] = useState<PositionResult | null>(null)

    const { videoRef } = useCameraStream(true, { mock: true })
    const [capture, actions] = useFrameCapture()

    const handleStart = () => {
        setPhase("capturing")
        setResult(null)

        actions.startCapture(videoRef.current!, {
            frameThreshold: 15,
            showPreview: true,
            onFrameThreshold: async (frames) => {
                setPhase("estimating")
                const res = await estimatePosition(
                    frames,
                    "mock-location-123",
                    { latitude: -33.8688, longitude: 151.2093 },
                    { mock: true },
                )
                setResult(res)
                setPhase(res.type === "success" ? "done" : "error")
            },
        })
    }

    const handleReset = () => {
        setPhase("idle")
        setResult(null)
        actions.reset()
    }

    return (
        <div className="app">
            <h1>Hyperlocal SDK Demo</h1>
            <p className="subtitle">Mock mode — no camera or API required</p>

            <div className="video-container">
                <video ref={videoRef} autoPlay playsInline muted />
                {phase === "capturing" && (
                    <div className="overlay">
                        Capturing... {capture.capturedCount} frames
                    </div>
                )}
                {phase === "estimating" && (
                    <div className="overlay">Estimating position...</div>
                )}
            </div>

            <div className="controls">
                {(phase === "idle" || phase === "done" || phase === "error") && (
                    <button onClick={handleStart}>
                        {phase === "idle" ? "Find My Position" : "Try Again"}
                    </button>
                )}
                {phase !== "idle" && (
                    <button onClick={handleReset} className="secondary">
                        Reset
                    </button>
                )}
            </div>

            {capture.previewUrls.length > 0 && (
                <div className="previews">
                    <h3>Captured Frames</h3>
                    <div className="preview-grid">
                        {capture.previewUrls.map((url, i) => (
                            <img key={i} src={url} alt={`Frame ${i + 1}`} />
                        ))}
                    </div>
                </div>
            )}

            {result && (
                <div className={`result ${result.type}`}>
                    <h3>Result</h3>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    )
}
