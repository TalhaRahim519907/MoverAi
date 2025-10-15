import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { AppState, InventoryData, SavedInventoryData } from './types';
import { AppStatus } from './types';
import { generateInventoryFromDescription, generateDescriptionFromVideo } from './services/geminiService';
import { getSavedInventories, saveInventory, deleteInventoryById } from './services/storageService';
import { HeaderIcon, ErrorIcon, CheckCircleIcon, CameraIcon, StopIcon } from './components/Icons';
import ProcessingIndicator from './components/ProcessingIndicator';
import InventoryResult from './components/InventoryResult';
import SavedInventoriesPage from './components/SavedInventoriesPage';


// --- VideoCapture Component Definition ---
interface VideoCaptureProps {
  onCaptureComplete: (videoFile: File) => void;
  onCancel: () => void;
}

const VideoCapture: React.FC<VideoCaptureProps> = ({ onCaptureComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: true,
        });
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access camera. Please check permissions and try again.");
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleStartRecording = () => {
    if (streamRef.current) {
      const recordedChunks: Blob[] = [];
      const options = { mimeType: 'video/webm' };
      try {
        const mediaRecorder = new MediaRecorder(streamRef.current, options);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const fileName = `moverai-capture-${new Date().toISOString()}.webm`;
            const videoFile = new File([blob], fileName, { type: 'video/webm' });
            if (videoFile.size > 0) {
              onCaptureComplete(videoFile);
            }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (e) {
         console.error("Error starting MediaRecorder:", e);
         setError("Could not start recording. Your browser may not support this format.");
      }
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-gray-900/50 p-8 rounded-xl shadow-2xl border border-red-700/50 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={onCancel}
          className="mt-4 px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-gray-900/50 p-4 sm:p-6 rounded-xl shadow-2xl border border-gray-700/50">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-700">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600/80 text-white px-3 py-1 rounded-md text-sm font-semibold animate-pulse">
            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            REC
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-center items-center gap-6">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
          disabled={isRecording}
        >
          Cancel
        </button>
        {isRecording ? (
          <button
            onClick={handleStopRecording}
            className="flex items-center justify-center w-20 h-20 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all transform hover:scale-105"
            aria-label="Stop recording"
          >
            <StopIcon className="w-8 h-8"/>
          </button>
        ) : (
          <button
            onClick={handleStartRecording}
            disabled={!streamRef.current}
            className="flex items-center justify-center w-20 h-20 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full shadow-lg ring-4 ring-cyan-500/50 ring-offset-2 ring-offset-gray-900 transition-all transform hover:scale-105 disabled:bg-gray-800 disabled:cursor-not-allowed disabled:ring-0"
            aria-label="Start recording"
          >
             <CameraIcon className="w-8 h-8"/>
          </button>
        )}
        <div className="w-[88px]"></div>
      </div>
    </div>
  );
};


type View = 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'LIST_INVENTORIES' | 'CAPTURING_VIDEO';

const App: React.FC = () => {
  const [description, setDescription] = useState<string>('');
  const [view, setView] = useState<View>('IDLE');
  const [activeInventory, setActiveInventory] = useState<InventoryData | SavedInventoryData | null>(null);
  const [savedInventories, setSavedInventories] = useState<SavedInventoryData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState<boolean>(false);

  useEffect(() => {
    setSavedInventories(getSavedInventories());
  }, []);

  const processVideoFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsProcessingVideo(true);
    setError(null);
    setDescription('');

    try {
      const generatedDescription = await generateDescriptionFromVideo(file);
      setDescription(generatedDescription);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process the video file.');
      setFileName(null);
    } finally {
      setIsProcessingVideo(false);
    }
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      await processVideoFile(event.target.files[0]);
    } else {
      setFileName(null);
    }
  }, [processVideoFile]);

  const handleCaptureComplete = useCallback(async (videoFile: File) => {
    setView('IDLE');
    await processVideoFile(videoFile);
  }, [processVideoFile]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please describe the contents of your space for an accurate estimate.');
      return;
    }
    setError(null);
    setView('PROCESSING');
    setActiveInventory(null);

    try {
      const result = await generateInventoryFromDescription(description);
      setActiveInventory(result);
      setView('SUCCESS');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setView('ERROR');
    }
  }, [description]);
  
  const handleResetToIdle = () => {
    setView('IDLE');
    setActiveInventory(null);
    setError(null);
    setDescription('');
    setFileName(null);
    setIsProcessingVideo(false);
    const fileInput = document.getElementById('video-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };
  
  const handleSaveInventory = (inventoryToSave: InventoryData) => {
    const newSavedItem = saveInventory(inventoryToSave);
    setSavedInventories(prev => [newSavedItem, ...prev]);
    setView('LIST_INVENTORIES');
  };

  const handleDeleteInventory = (id: string) => {
    deleteInventoryById(id);
    const updatedList = getSavedInventories();
    setSavedInventories(updatedList);
    // If the deleted inventory was the active one, go back to the list.
    if (activeInventory && 'id' in activeInventory && activeInventory.id === id) {
       setView('LIST_INVENTORIES');
       setActiveInventory(null);
    }
  };
  
  const handleViewInventory = (inventory: SavedInventoryData) => {
    setActiveInventory(inventory);
    setView('SUCCESS');
  };

  const renderContent = () => {
    switch (view) {
      case 'CAPTURING_VIDEO':
        return <VideoCapture 
          onCaptureComplete={handleCaptureComplete} 
          onCancel={() => setView('IDLE')}
        />;
      case 'PROCESSING':
        return <ProcessingIndicator />;
      case 'SUCCESS':
        return activeInventory ? (
          <InventoryResult 
            data={activeInventory} 
            onSave={handleSaveInventory}
            onDelete={handleDeleteInventory}
            onDone={() => {
              if (activeInventory && 'id' in activeInventory) {
                setView('LIST_INVENTORIES');
              } else {
                handleResetToIdle();
              }
            }}
          />
        ) : null;
      case 'LIST_INVENTORIES':
        return <SavedInventoriesPage 
          inventories={savedInventories}
          onView={handleViewInventory}
          onDelete={handleDeleteInventory}
          onNew={handleResetToIdle}
        />;
      case 'ERROR':
        return (
          <div className="text-center p-8 bg-red-900/20 border border-red-500 rounded-lg">
            <ErrorIcon className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h3 className="text-xl font-bold text-red-300 mb-2">Analysis Failed</h3>
            <p className="text-red-200">{error}</p>
            <button
              onClick={handleResetToIdle}
              className="mt-6 px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        );
      case 'IDLE':
      default:
        return (
          <div className="w-full max-w-2xl mx-auto bg-gray-900/50 p-8 rounded-xl shadow-2xl border border-gray-700/50">
            <h2 className="text-3xl font-bold text-center mb-2 text-gray-100">Get Your Moving Estimate</h2>
            <p className="text-center text-gray-400 mb-8">
              Upload a video or create a new inventory to begin.
            </p>

            {savedInventories.length > 0 && (
                <div className="text-center mb-8">
                    <button
                        onClick={() => setView('LIST_INVENTORIES')}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                        View {savedInventories.length} Saved Inventor{savedInventories.length > 1 ? 'ies' : 'y'} &rarr;
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  1. Provide a Video
                </label>
                <div className="mt-1 flex flex-col justify-center items-center px-6 pt-5 pb-6 border-2 border-gray-700 border-dashed rounded-md hover:border-cyan-500 transition-colors">
                  <div className="space-y-1 text-center">
                    {isProcessingVideo ? (
                      <div className="py-4">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
                        </div>
                        <p className="text-sm text-gray-400 pt-4">Analyzing video...</p>
                        <p className="text-xs text-gray-500">A description will be generated below.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-400">
                          <label htmlFor="video-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-cyan-400 hover:text-cyan-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-cyan-500 px-4 py-2 inline-flex items-center transition-colors">
                            <span>Upload a file</span>
                            <input id="video-upload" name="video-upload" type="file" className="sr-only" accept="video/*" onChange={handleFileChange} />
                          </label>
                          <span className="hidden sm:inline">or</span>
                          <button
                              type="button"
                              onClick={() => setView('CAPTURING_VIDEO')}
                              className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
                          >
                              <CameraIcon className="-ml-1 mr-2 h-5 w-5" />
                              Use Camera
                          </button>
                        </div>
                        {fileName ? (
                          <p className="text-sm text-green-400 pt-4"><CheckCircleIcon className="inline w-4 h-4 mr-1" />{fileName}</p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-4">MP4, MOV, WebM, etc. up to 500MB</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  2. Describe the space & items (or let the video do it for you)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full bg-gray-800 border-gray-700 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-gray-200 placeholder-gray-500 disabled:bg-gray-800/50 disabled:cursor-wait"
                  placeholder="e.g., 'The living room has a large L-shaped couch, a glass coffee table, and a 70-inch TV on a stand...'"
                  required
                  disabled={isProcessingVideo}
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="text-center pt-2">
                <button
                  type="submit"
                  disabled={view === 'PROCESSING' || isProcessingVideo}
                  className="w-full sm:w-auto inline-flex justify-center items-center px-10 py-3 border border-transparent text-base font-medium rounded-md shadow-lg text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessingVideo ? 'Processing Video...' : 'Generate Inventory'}
                </button>
              </div>
            </form>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-4 sm:p-8 flex flex-col items-center">
      <header className="text-center mb-10">
        <div className="flex items-center justify-center gap-4 mb-2">
          <HeaderIcon className="w-12 h-12 text-cyan-400" />
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-300">MoverAi</h1>
        </div>
        <p className="text-lg text-gray-400">Your intelligent moving inventory assistant.</p>
      </header>
      <main className="w-full flex-grow flex items-center justify-center">
        {renderContent()}
      </main>
      <footer className="text-center mt-10 text-gray-600 text-sm">
        <p>&copy; {new Date().getFullYear()} MoverAi. Your move, simplified.</p>
      </footer>
    </div>
  );
};

export default App;