import React, { useState, useEffect, useRef } from 'react'
import Transcription from './Transcription'
import Translation from './Translation'

export default function Information(props) {
  const {output} = props
  const [tab, setTab] = useState('transcription')
  const[translation, setTranslation] = useState(null)
  const [translating, setTranslating] = useState(null)
  const [toLanguage, setToLanguage] = useState('Select Language')

  console.log(output)

  const worker = useRef()

  useEffect(() => {
    // Clear old translation when language changes
    setTranslation(null);
  }, [toLanguage]);

  useEffect(() => {
    if(!worker.current){
      worker.current = new Worker(new URL('../utils/translate.worker.js', import.meta.url), {
        type: 'module'
      })
    }

    const onMessageReceived = async (e) =>{
      switch(e.data.status){
        case 'initiate':
          console.log('DOWNLOADING')
          break;
        case 'progress':
          console.log('LOADING')
          break;
        // case 'update':
        //   setTranslation(e.data.output)
        //   console.log(e.data.output)
        //   break;

        // e.data.output is an array - [{ translation_text: "Hello, how are you?" }]
        case 'update':
          const outputText = Array.isArray(e.data.output)
            ? e.data.output.map(obj => obj.translation_text).join(' ')
            : e.data.output;
          setTranslation(outputText);
          console.log(outputText);
          break;
        case 'complete':
          setTranslating(false)
          console.log('DONE')
          break;
      }
    }

    worker.current.addEventListener('message', onMessageReceived)
    
    return () => worker.current.removeEventListener('message', onMessageReceived)
  })

  const textElement = tab === 'transcription' ? output.map(val => val.text) : translation || 'No translation' 

  function handleCopy(){
    navigator.clipboard.writeText(textElement)
  }

  function handleDownload(){
    const element = document.createElement('a')
    const file = new Blob([textElement], {type: 'text/plain'})
    element.href = URL.createObjectURL(file)
    element.download = `FreeScribe_${new Date().toString()}.txt`
    document.body.appendChild(element)
    element.click()
  }

  function generateTranslation() {
    if (translating || toLanguage === 'Select Language') {
      return;
    }
  
    if (!output || output.length === 0 || !output[0].text) {
      console.warn("No text to translate");
      return;
    }
  
    setTranslating(true);
    setTranslation(null);  // Clear any previous translation before sending request

    console.log("Translating to:", toLanguage);
  
    worker.current.postMessage({
      text: output.map(val => val.text),
      src_lang: 'eng_Latn',
      tgt_lang: toLanguage   
    });
  }

  return (
    <main className='flex-1 p-4 flex flex-col gap-3 sm:gap-4 justify-center text-center pb-20 max-w-prose w-full mx-auto'>
      <h1 className='font-semibold text-5xl sm:text-5xl md:text-6xl whitespace-nowrap'>Your <span className='text-blue-400 bold'>Transcription</span></h1>
    
      <div className='grid grid-cols-2 mx-auto bg-white shadow rounded-full overflow-hidden items-center'>
        <button onClick={()=> setTab('transcription')} className={'cursor-pointer px-4 duration-200 py-1 ' + (tab === 'transcription'? ' bg-blue-300 text-white' : ' text-blue-400 hover:text-blue-600')}>Transcription</button>
        <button onClick={()=> setTab('translation')} className={'cursor-pointer px-4 duration-200 py-1 ' + (tab === 'translation'? ' bg-blue-300 text-white' : ' text-blue-400 hover:text-blue-600')}>Translation</button>
      </div>

      <div className='my-8 flex flex-col'>
        {tab === 'transcription' ? (
          <Transcription {...props} textElement={textElement}/>
        ) : (
          <Translation {...props} toLanguage={toLanguage} translating={translating} textElement={textElement} setTranslating={setTranslating} setTranslation={setTranslation} setToLanguage={setToLanguage} generateTranslation={generateTranslation}/>
        )}
      </div>
      
      <div className='flex items-center gap-4 mx-auto'>
        <button onClick={handleCopy} title='Copy' className='bg-white hover:text-blue-500 duration:200  text-blue-300 p-2 rounded px-2 aspect-square grid place-items-center rounded'>
          <i className="fa-solid fa-copy"></i>
        </button>
        <button onClick={handleDownload} title='Download' className='bg-white hover:text-blue-500 duration:200 text-blue-300 p-2 rounded px-2 aspect-square grid place-items-center rounded'>
          <i className="fa-solid fa-download"></i>
        </button>
      </div>
    </main>

  )
}
