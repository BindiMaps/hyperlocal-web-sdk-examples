# basic-react

Minimal React example showing how to integrate both BindiMaps SDK packages in mock mode.

## What this example demonstrates

- Camera stream setup with `useCameraStream` from `@bindimaps/hyperlocal-react`
- Frame capture flow with `useFrameCapture` from `@bindimaps/hyperlocal-react`
- Position estimation with `estimatePosition` from `@bindimaps/hyperlocal-web-sdk`

## Why two SDKs are used

- `@bindimaps/hyperlocal-react` handles React-friendly UI/runtime integration.
- `@bindimaps/hyperlocal-web-sdk` handles core localisation calls.
- Together: React hooks orchestrate capture, then core SDK estimates position from captured frames.

## Run locally

```bash
npm install
npm run start
```

Dev server: `http://localhost:5913`

## Build

```bash
npm run build
```

## Integration map

In `src/App.tsx`:

- `useCameraStream(true, { mock: true })` creates the video stream ref
- `actions.startCapture(videoElement, { frameThreshold, onFrameThreshold })` captures frames
- `estimatePosition(frames, locationId, approximateCoordinates, { mock: true })` returns the localisation result

## Moving from mock to real setup

- Replace `mock-location-123` with your real location identifier
- Replace mock coordinates with an appropriate approximate location
- Remove/adjust `{ mock: true }` options based on your environment
