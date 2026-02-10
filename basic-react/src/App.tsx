import { useState, useEffect } from "react"
import { useCameraStream, useFrameCapture } from "@bindimaps/hyperlocal-react"
import { estimatePosition, HyperlocalEnvironment, type PositionResult, type CapturedFrame } from "@bindimaps/hyperlocal-web-sdk"

type Phase = "idle" | "capturing" | "estimating" | "done" | "error"
type InputMode = "camera" | "payload"

type AppConfig = {
    mock: boolean
    locationId: string
    environment: number
    lat: string
    lng: string
    gpsAuto: boolean
}

type TestPayload = {
    mock?: boolean
    locationId: string
    environment?: number
    lat: number
    lng: number
    images: string[]
}

const PAYLOAD_TEMPLATE = `{
  "mock": false,
  "locationId": "your-location-id",
  "environment": ${HyperlocalEnvironment.PROD_PUBLIC},
  "lat": -33.8688,
  "lng": 151.2093,
  "images": [
    "data:image/jpeg;base64,/9j/4AAQ...",
    "data:image/jpeg;base64,/9j/4AAQ..."
  ]
}`

const CONFIG_KEY = "hl-config"
const PAYLOAD_KEY = "hl-payload"

const DEFAULT_CONFIG: AppConfig = {
    mock: true,
    locationId: "",
    environment: HyperlocalEnvironment.PROD_PUBLIC,
    lat: "",
    lng: "",
    gpsAuto: true,
}

function loadConfig(): AppConfig {
    try {
        const raw = localStorage.getItem(CONFIG_KEY)
        if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    } catch { /* ignore corrupt data */ }
    return DEFAULT_CONFIG
}

function loadPayload(): string {
    return localStorage.getItem(PAYLOAD_KEY) ?? PAYLOAD_TEMPLATE
}

function isValidImageEntry(u: unknown): boolean {
    if (typeof u !== "string" || u.length < 20) return false
    if (u.startsWith("data:")) return u.includes(",") && u.split(",")[1].length > 10
    return u.startsWith("http://") || u.startsWith("https://")
}

function parsePayload(raw: string): TestPayload | null {
    try {
        const obj = JSON.parse(raw)
        if (
            typeof obj.locationId === "string" && obj.locationId &&
            typeof obj.lat === "number" &&
            typeof obj.lng === "number" &&
            Array.isArray(obj.images) && obj.images.length >= 1 &&
            obj.images.every(isValidImageEntry)
        ) return obj as TestPayload
    } catch { /* invalid json */ }
    return null
}

function dataUriToBlob(dataUri: string): Blob {
    const [header, b64] = dataUri.split(",")
    const mime = header.match(/:(.*?);/)?.[1] ?? "image/png"
    const bytes = atob(b64)
    const buf = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i)
    return new Blob([buf], { type: mime })
}

async function fetchFrames(urls: string[]): Promise<CapturedFrame[]> {
    return Promise.all(
        urls.map(async (url) => {
            let imageData: Blob
            if (url.startsWith("data:")) {
                imageData = dataUriToBlob(url)
            } else {
                const res = await fetch(url)
                if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
                imageData = await res.blob()
            }
            return { timestamp: new Date(), imageData }
        }),
    )
}

const ENV_LABELS: Record<number, string> = {
    [HyperlocalEnvironment.UNSPECIFIED]: "Unspecified",
    [HyperlocalEnvironment.DEV_PREVIEW]: "Dev Preview",
    [HyperlocalEnvironment.DEV_PUBLIC]: "Dev Public",
    [HyperlocalEnvironment.PROD_PREVIEW]: "Prod Preview",
    [HyperlocalEnvironment.PROD_PUBLIC]: "Prod Public",
}

export function App() {
    const [phase, setPhase] = useState<Phase>("idle")
    const [result, setResult] = useState<PositionResult | null>(null)
    const [errorDetail, setErrorDetail] = useState<unknown>(null)
    const [config, setConfig] = useState<AppConfig>(loadConfig)
    const [inputMode, setInputMode] = useState<InputMode>("camera")
    const [payloadText, setPayloadText] = useState<string>(loadPayload)

    // Persist config + payload to localStorage
    useEffect(() => {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
    }, [config])
    useEffect(() => {
        localStorage.setItem(PAYLOAD_KEY, payloadText)
    }, [payloadText])

    const updateConfig = (patch: Partial<AppConfig>) =>
        setConfig((prev) => ({ ...prev, ...patch }))

    const requestGps = () => {
        navigator.geolocation.getCurrentPosition(
            (pos) => updateConfig({
                lat: String(pos.coords.latitude),
                lng: String(pos.coords.longitude),
            }),
            () => { /* denied or unavailable — user enters manually */ },
        )
    }

    const { videoRef } = useCameraStream(inputMode === "camera", { mock: config.mock })
    const [capture, actions] = useFrameCapture()

    const parsedPayload = inputMode === "payload" ? parsePayload(payloadText) : null

    const isRealModeReady =
        config.mock ||
        (config.locationId.trim() !== "" &&
            config.lat.trim() !== "" && !isNaN(parseFloat(config.lat)) &&
            config.lng.trim() !== "" && !isNaN(parseFloat(config.lng)))

    const canStart = inputMode === "camera" ? isRealModeReady : parsedPayload !== null

    const handleStart = () => {
        if (inputMode === "payload") {
            handlePayloadRun()
            return
        }

        const videoElement = videoRef.current
        if (!videoElement) {
            setPhase("error")
            return
        }

        setPhase("capturing")
        setResult(null)
        setErrorDetail(null)

        actions.startCapture(videoElement, {
            frameThreshold: 15,
            showPreview: true,
            onFrameThreshold: async (frames) => {
                setPhase("estimating")
                try {
                    const res = await estimatePosition(
                        frames,
                        config.mock ? "mock-location-123" : config.locationId,
                        {
                            latitude: parseFloat(config.lat) || -33.8688,
                            longitude: parseFloat(config.lng) || 151.2093,
                        },
                        config.mock
                            ? { mock: true }
                            : { environment: config.environment },
                    )
                    setResult(res)
                    setPhase(res.type === "success" ? "done" : "error")
                } catch (error) {
                    console.error("estimatePosition failed", error)
                    setErrorDetail(error)
                    setPhase("error")
                }
            },
        })
    }

    const handlePayloadRun = async () => {
        if (!parsedPayload) return
        setPhase("estimating")
        setResult(null)
        setErrorDetail(null)
        try {
            const frames = await fetchFrames(parsedPayload.images)
            const res = await estimatePosition(
                frames,
                parsedPayload.locationId,
                { latitude: parsedPayload.lat, longitude: parsedPayload.lng },
                parsedPayload.mock
                    ? { mock: true }
                    : { environment: parsedPayload.environment ?? HyperlocalEnvironment.PROD_PUBLIC },
            )
            setResult(res)
            setPhase(res.type === "success" ? "done" : "error")
        } catch (error) {
            console.error("estimatePosition from payload failed", error)
            setErrorDetail(error)
            setPhase("error")
        }
    }

    const handleReset = () => {
        setPhase("idle")
        setResult(null)
        setErrorDetail(null)
        actions.reset()
    }

    return (
        <div className="app">
            <h1>Hyperlocal SDK Demo</h1>
            <p className="subtitle">
                {inputMode === "payload"
                    ? "Payload mode — estimate from pasted image URLs"
                    : config.mock
                        ? "Mock mode — no camera or API required"
                        : "Real mode — live SDK calls"}
            </p>

            {/* ── Input mode tabs ── */}
            <div className="mode-tabs">
                <button
                    className={`mode-tab ${inputMode === "camera" ? "active" : ""}`}
                    onClick={() => setInputMode("camera")}
                >
                    Camera
                </button>
                <button
                    className={`mode-tab ${inputMode === "payload" ? "active" : ""}`}
                    onClick={() => setInputMode("payload")}
                >
                    Paste Payload
                </button>
            </div>

            {/* ── Camera config panel ── */}
            {inputMode === "camera" && (
                <div className="config-panel">
                    <label className="config-row">
                        <input
                            type="checkbox"
                            checked={config.mock}
                            onChange={(e) => updateConfig({ mock: e.target.checked })}
                        />
                        Mock mode
                    </label>

                    {!config.mock && (
                        <>
                            <label className="config-row">
                                <span className="config-label">Location ID</span>
                                <input
                                    type="text"
                                    className="config-input"
                                    placeholder="e.g. loc_abc123"
                                    value={config.locationId}
                                    onChange={(e) => updateConfig({ locationId: e.target.value })}
                                />
                            </label>

                            <label className="config-row">
                                <span className="config-label">Environment</span>
                                <select
                                    className="config-input"
                                    value={config.environment}
                                    onChange={(e) => updateConfig({ environment: Number(e.target.value) })}
                                >
                                    {Object.entries(ENV_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="config-row">
                                <input
                                    type="checkbox"
                                    checked={config.gpsAuto}
                                    onChange={(e) => {
                                        updateConfig({ gpsAuto: e.target.checked })
                                        if (e.target.checked) requestGps()
                                    }}
                                />
                                Auto-detect GPS
                            </label>

                            <div className="config-row config-gps">
                                <label>
                                    <span className="config-label">Lat</span>
                                    <input
                                        type="number"
                                        className="config-input"
                                        step="any"
                                        placeholder="-33.8688"
                                        value={config.lat}
                                        onChange={(e) => updateConfig({ lat: e.target.value })}
                                    />
                                </label>
                                <label>
                                    <span className="config-label">Lng</span>
                                    <input
                                        type="number"
                                        className="config-input"
                                        step="any"
                                        placeholder="151.2093"
                                        value={config.lng}
                                        onChange={(e) => updateConfig({ lng: e.target.value })}
                                    />
                                </label>
                            </div>

                            {!isRealModeReady && (
                                <p className="config-hint">Fill in location ID and GPS to enable capture</p>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ── Payload panel ── */}
            {inputMode === "payload" && (
                <div className="config-panel">
                    <textarea
                        className="payload-input"
                        rows={12}
                        spellCheck={false}
                        value={payloadText}
                        onChange={(e) => setPayloadText(e.target.value)}
                    />
                    {!parsedPayload && payloadText.trim() !== "" && (
                        <p className="config-hint">
                            Invalid payload — needs locationId, lat, lng, and images[]
                        </p>
                    )}
                </div>
            )}

            {/* ── Video (camera mode only) ── */}
            {inputMode === "camera" && (
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
            )}

            {/* ── Estimating overlay for payload mode ── */}
            {inputMode === "payload" && phase === "estimating" && (
                <div className="payload-status">Fetching images & estimating...</div>
            )}

            <div className="controls">
                {(phase === "idle" || phase === "done" || phase === "error") && (
                    <button onClick={handleStart} disabled={!canStart}>
                        {inputMode === "payload"
                            ? "Estimate from Payload"
                            : phase === "idle" ? "Find My Position" : "Try Again"}
                    </button>
                )}
                {phase !== "idle" && (
                    <button onClick={handleReset} className="secondary">
                        Reset
                    </button>
                )}
            </div>

            {inputMode === "camera" && capture.previewUrls.length > 0 && (
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
                    <h3>Response</h3>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}

            {!result && errorDetail && (
                <div className="result error">
                    <h3>Error</h3>
                    <pre>{errorDetail instanceof Error
                        ? `${errorDetail.name}: ${errorDetail.message}`
                        : JSON.stringify(errorDetail, null, 2)}</pre>
                </div>
            )}
        </div>
    )
}
