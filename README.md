# 🎙️FreeScribe - In-Browser Transcription & Translation App

**FreeScribe** is a fully browser-based audio transcription and translation tool built with React and Web Workers. It enables users to record or upload audio, transcribe speech to text using machine learning models running locally in the browser, and translate the transcribed text into over 100 languages — all without requiring any backend or API integration.

## Features

### Audio Input
- Record audio directly from the user's microphone using the MediaRecorder API
- Upload audio files in `.mp3` or `.wav` formats
- Display real-time recording duration

### Transcription
- Uses a browser-executed model based on **Whisper Tiny (English-only)** for speech-to-text conversion
- Processes audio into partial and final transcription results using chunked inference
- Visual loading indicators to show model readiness and transcription progress

### Translation
- Translates transcription into 100+ languages using Meta’s **NLLB-200 distilled model**
- Translation is fully client-side, executed in a separate Web Worker
- Language selection via dropdown with intuitive labels
- Partial updates and final translated output displayed dynamically

### Output Actions
- Copy transcription or translation to clipboard
- Download output as a `.txt` file
- Download recorded audio as `.webm` for offline access or reuse

### Interactive UI
- Responsive layout optimized for both desktop and mobile
- Animated loading bars using CSS keyframes
- Font Awesome icons and Tailwind transitions for an enhanced experience

## Tech Stack

- **React** – Frontend framework
- **Tailwind CSS** – Utility-first styling
- **Web Workers** – Run Whisper and NLLB models without blocking the main thread
- **@xenova/transformers** – Runs Hugging Face models directly in the browser (no server/API)
- **MediaRecorder API** – Record microphone input
- **AudioContext API** – Decode uploaded audio files
- **Blob & Object URLs** – Dynamic audio and file handling
- **CSS Animations & Transitions** – Animate loading bars and spinners

## Key Modules

### `components/`
| File                 | Purpose                                      |
|----------------------|----------------------------------------------|
| `HomePage.jsx`       | Microphone recording and file upload         |
| `FileDisplay.jsx`    | Displays selected audio with playback & reset|
| `Transcribing.jsx`   | Shows animated loader while model is running |
| `Information.jsx`    | Tab toggle between transcription/translation |
| `Transcription.jsx`  | Displays transcribed text                    |
| `Translation.jsx`    | Language dropdown and translated output UI   |

### `utils/`
| File                   | Purpose                                  |
|------------------------|------------------------------------------|
| `whisper.worker.js`    | Runs Whisper transcription in browser    |
| `translate.worker.js`  | Runs NLLB translation via Web Worker     |
| `presets.js`           | Holds constants like language maps       |

## App Flow

1. **Landing Screen (HomePage)**
   - User can either:
     - Record live audio using the microphone
     - Upload an existing `.mp3` or `.wav` file

2. **File Display Screen**
   - Shows audio name and playback controls
   - User clicks “Transcribe” to start processing

3. **Transcription Stage**
   - Whisper model loads via Web Worker
   - UI shows animated loading bars during inference
   - Final transcript is displayed once processing completes

4. **Translation Stage**
   - User switches to the “Translation” tab
   - Selects a target language from the dropdown
   - NLLB model runs via a separate Web Worker
   - Translated text is shown with a loading spinner during processing

5. **User Actions**
   - Copy text to clipboard
   - Download transcription/translation as `.txt`
   - Download the recorded audio as `.webm`

## Getting Started

To run the app locally:

```bash
git clone https://github.com/SoumyaGanesh12/FreeScribe.git
npm install
npm run dev
```
Open http://localhost:5173 in your browser

## Conclusion

FreeScribe demonstrates a fully client-side implementation of speech-to-text and translation using modern web technologies and on-device machine learning.
