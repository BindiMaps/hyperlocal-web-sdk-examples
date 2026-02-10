# Hyperlocal Web SDK Examples

Example applications demonstrating the [Hyperlocal Web SDK](https://www.npmjs.com/package/@bindimaps/hyperlocal-web-sdk) and [Hyperlocal React](https://www.npmjs.com/package/@bindimaps/hyperlocal-react) packages.

## SDK roles

- `@bindimaps/hyperlocal-react` provides React-first hooks for camera stream and capture flow.
- `@bindimaps/hyperlocal-web-sdk` provides core localisation APIs like `estimatePosition`.
- In React apps, you usually use both: hooks for UI/runtime wiring, core SDK for estimation calls.

## Examples

- [`basic-react`](./basic-react): Minimal React app with camera capture, frame selection, and position estimation in mock mode.

## Integration pipeline

`useCameraStream` -> `useFrameCapture` -> `estimatePosition`  
Camera feed -> captured frames -> position estimate.

## Getting started

```bash
git clone https://github.com/nicejudy/hyperlocal-web-sdk-examples.git
cd hyperlocal-web-sdk-examples/basic-react
npm install
npm run start
npm run build
```

`basic-react` runs on `http://localhost:5913`.

> **Note:** The SDK packages use mock mode by default in these examples, so no API key or camera access is required to run them.

## Repository layout

- `basic-react/`: Vite + React + TypeScript example using both SDK packages in mock mode.
