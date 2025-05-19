import { useState, useEffect, useRef } from 'react'
import HomePage from './components/HomePage'
import Header from './components/Header'
import FileDisplay from './components/FileDisplay'
import Information from './components/Information'
import Transcribing from './components/Transcribing'
import { MessageTypes } from './utils/presets'

function App() {
  const [file, setFile] = useState(null)
  const [audioStream, setAudioStream] = useState(null)
  const [output, setOutput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [finished, setFinished] = useState(false)
 
  const isAudioAvailble = file || audioStream

  function handleAudioReset(){
    setAudioStream(null)
    setFile(null)
  }

  const worker = useRef(null)

  useEffect(() => {
    if(!worker.current){
      worker.current = new Worker(new URL('./utils/whisper.worker.js', import.meta.url), {
        type: 'module'
      })
    }

    const onMessageReceived = async (e) =>{
      console.log("Message from worker:", e.data)
      if (e.data.type === 'RESULT') {
        console.log("Got final transcription result", e.data.results);
      }
      switch(e.data.type){
        case 'DOWNLOADING':
          setDownloading(true)
          console.log('DOWNLOADING')
          break;
        case 'LOADING':
          setLoading(true)
          console.log('LOADING')
          break;
        case 'RESULT':
          setOutput(e.data.results)
          console.log(e.data.results)
          break;
        case 'INFERENCE_DONE':
          setFinished(true)
          console.log('DONE')
          break;
      }
    }

    // Syntax of addEventListener - target.addEventListener(type - string, listener - function, options)
    worker.current.addEventListener('message', onMessageReceived)

    // Clean up function of useEffect
    return () => worker.current.removeEventListener('message', onMessageReceived)
  }, [])

  // Flow -
  // [React App Mounts]
  //    ↓
  // Creates Web Worker
  //    ↓
  // Adds message listener to worker (addEventListener)
  //    ↓
  // Worker runs & sends message → onMessageReceived() runs
  //    ↓
  // On unmount → removeEventListener to clean up

  // useEffect(() => {
  //   console.log(audioStream)
  // }, [audioStream])

  // Convert an audio file or stream into a raw Float32Array (an array of numbers representing the audio waveform)
  // Whisper model gets this array for transcription
  async function readAudioFrom(file){
    const sampling_rate = 16000
    // AudioContext - built-in browser API
    const audioCTX = new AudioContext({sampleRate: sampling_rate})
    // response - raw Float32Array
    const response = await file.arrayBuffer()
    const decoded = await audioCTX.decodeAudioData(response)
    const audio = decoded.getChannelData(0)
    // Return the array to whisper for processing
    return audio
  }

  // Flow -
  // User uploads audio → (React app)
  //         ↓
  // AudioContext decodes audio into Float32Array
  //         ↓
  // Worker receives Float32Array via postMessage()
  //         ↓
  // Worker runs Whisper model (AI transcription)
  //         ↓
  // Worker sends back transcript via postMessage()
  //         ↓
  // React UI displays the text

  async function handleFormSubmission(){
    if(!file && !audioStream){ return}

    setLoading(true);

    // audio - raw Float32Array
    let audio = await readAudioFrom( file ? file : audioStream)
    const model_name = `openai/whisper-tiny.en`

    worker.current.postMessage({
      type: MessageTypes.INFERENCE_REQUEST,
      audio,
      model_name
    })

    console.log("Message posted to worker!")
  }

  // Four possible UI screens:
  // 1. Information – when transcription output is ready
  // 2. Transcribing – when audio is being processed
  // 3. FileDisplay – when audio input is available
  // 4. HomePage – default starting screen (no audio uploaded yet)
  return (
    <div className='flex flex-col max-w-[1000ps] mx-auto w-full'>
      <section className='min-h-screen flex flex-col'>
        <Header/>
        {output ? (
          <Information output={output} finished={finished}/>
        ) : loading ? (
          <Transcribing/>
        ) : isAudioAvailble ? (
          <FileDisplay handleFormSubmission={handleFormSubmission} handleAudioReset={handleAudioReset} file={file} audioStream={audioStream}/>
        ) : (
          <HomePage setFile={setFile} setAudioStream={setAudioStream}/>
        )}
        
      </section>
      <footer></footer>
    </div>
  )
}

export default App
