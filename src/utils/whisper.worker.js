import {env, pipeline} from '@xenova/transformers'
import { MessageTypes } from './presets'

// Sets the environment behavior for @xenova/transformers:
env.allowLocalModels = false; // Don’t use local models
env.allowRemoteModels = true; // Allow downloading from Hugging Face
env.useBrowserCache = false; // Don’t cache models in the browser

// Javascript class, not class component of React - Model is loaded only once, no usage of ui here
class MyTranscriptionPipeline {
    static task = 'automatic-speech-recognition';
    static model = 'whisper-tiny.en';
    static instance = null;

    static async getInstance(progress_callback = null) {
        // progress_callback - load_model_callback function
        // @xenova/transformers handles calling it with progress data while loading
        // progress data -
        // {
        //     status: "progress",
        //     file: "model.onnx",
        //     progress: 0.37,
        //     loaded: 4231824,
        //     total: 11346220
        //  }
        if (this.instance === null) {
            this.instance = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
                progress_callback
            }); 
        }
        return this.instance;
    }
}

// In a Web Worker context, self refers to the global scope of the worker thread
// In the context of a Web Worker, 'message' is a specific built-in event type that tells the worker:
// “Hey, a message just came in from the main thread!”
self.addEventListener('message', async (event) => {
    const {type, audio} = event.data
    if(type === MessageTypes.INFERENCE_REQUEST){
        await transcribe(audio)
    }
})

async function transcribe(audio){
    sendLoadingMessage('Loading')

    let pipeInstance;

    try{
        // pipeIntsnace is an instance of class
        // In the @xenova/transformers library (open-source), the pipeline() function actually creates a special class instance, and then adds a callable function to it.
        // That object/instance can now be called like a function
        pipeInstance = await MyTranscriptionPipeline.getInstance(load_model_callback)
    } catch (e){
        console.error("Model loading failed:", e);
        return;
    }

    sendLoadingMessage('success')
    
    const stride_length_s = 5
    
    const generationTracker = new GenerationTracker(pipeInstance, stride_length_s)
    // audio - raw Float32Array
    await pipeInstance(audio, {
        top_k: 0,
        do_sample: false,
        chunk_length: 30, // Whisper will process the audio in 30-second chunks
        stride_length_s,
        return_timestamps: true,
        callback_function: generationTracker.callbackFunction.bind(generationTracker),
        chunk_callback: generationTracker.chunkCallback.bind(generationTracker)
    })
    generationTracker.sendFinalResult()
}

async function load_model_callback(data){
    const {status} = data
    if(status === 'progress'){
        const {file, progress, loaded, total} = data
        sendDownloadingMessage(file, progress, loaded, total)
    }
    
}

function sendLoadingMessage(status){
    // Worker thread is communicating/ sending message back to the main thread - react app
    self.postMessage({
        type: MessageTypes.LOADING,
        status
    })
}

async function sendDownloadingMessage(file, progress, loaded, total) {
    self.postMessage({
        type: MessageTypes.DOWNLOADING,
        file,
        progress,
        loaded,
        total
    })
}

class GenerationTracker {
    constructor(pipeline, stride_length_s) {
        this.pipeline = pipeline
        this.stride_length_s = stride_length_s
        this.chunks = []
        this.time_precision = this.pipeline?.processor.feature_extractor.config.chunk_length / this.pipeline.model.config.max_source_positions
        this.processed_chunks = []
        this.callbackFunctionCounter = 0
    }

    // Signals to the main thread that transcription is finished
    sendFinalResult(){
        self.postMessage({
            type: MessageTypes.INFERENCE_DONE
        })
    }

    callbackFunction(beams){
        this.callbackFunctionCounter += 1
        // Only every 10th call sends a partial result
        if(this.callbackFunctionCounter % 10 !== 0 ){
            return
        }

        const bestBeam = beams[0]
        let text = this.pipeline.tokenizer.decode(bestBeam.output_token_ids, {
            skip_special_tokens: true
        })

        const result = {
            text,
            start: this.getLastChunkTimestamp(),
            end: undefined
        }

        createPartialResultMessage(result)
    }

    chunkCallback(data){
        this.chunks.push(data)
        const [text, {chunks}] = this.pipeline.tokenizer._decode_asr(
            this.chunks,
            {
                time_precision: this.time_precision,
                return_timestamps: true,
                force_full_sequence: false
            }
        )

        this.processed_chunks = chunks.map((chunk, index) => {
            return this.processChunk(chunk, index)
        })

        createResultMessage(
            this.processed_chunks, false, this.getLastChunkTimestamp()
        )
    }

    getLastChunkTimestamp(){
        if(this.processed_chunks.length === 0){
            return 0
        }
        const lastChunk = this.processed_chunks[this.processed_chunks.length - 1];
        return lastChunk.end;
    }

    processChunk(chunk, index){
        const {text, timestamp} = chunk
        const [start, end] = timestamp

        return {
            index,
            text: `${text.trim()}`,
            start: Math.round(start),
            end: Math.round(end) || Math.round(start + 0.9 * this.stride_length_s)
        }
    }
}

function createResultMessage(results, isDone, completedUntilTimestamp){
    self.postMessage({
        type: MessageTypes.RESULT,
        results,
        isDone,
        completedUntilTimestamp
    })
}

function createPartialResultMessage(result){
    self.postMessage({
        type: MessageTypes.RESULT_PARTIAL,
        result
    })
}

// Flow -
// [React App]
//  ⬇️ postMessage({ type: 'INFERENCE_REQUEST', audio })
//  ⬇️
// [Web Worker]
//  → Loads Whisper model (if not already)
//  → Decodes audio in small chunks
//  → Calls callbackFunction (streams partial results)
//  → Calls chunkCallback (builds final output)
//  ⬆️ postMessage({ type: 'RESULT' })
//  ⬆️ postMessage({ type: 'INFERENCE_DONE' })
// [React App displays results]
