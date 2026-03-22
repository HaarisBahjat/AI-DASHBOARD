import React,{ useState, useEffect ,useRef} from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3004'); // Adjust the URL as needed

export default function VoiceAssistant() {

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [isRecording, setIsRecording] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');

    useEffect(() => {
        socket.on("connect", () => {
            console.log("Connected to voice socket server",socket.id);
        });
        socket.on("voice-reply", (data) => {
            console.log("Received voice reply:", data.message);
            setReplyMessage(data.message);

  console.log("Assistant reply received");
            if(data.audioBuffer){
           const blob = new Blob(
    [new Uint8Array(data.audioBuffer)],
    { type: "audio/mpeg" }
  );

  const audio = new Audio(URL.createObjectURL(blob));
  audio.play();
      }

    });

  }, []);
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    }   ;
    mediaRecorder.onstop= async () => {
      console.log("Recording stopped");

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        
        console.log("Sending audio size:", arrayBuffer.byteLength);

        socket.emit("voice-message", {
        audioBuffer: Array.from(new Uint8Array(arrayBuffer)),
        userId: "test_user",
        conversationId: "test_convo"
      });
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };
  return (

    <div style={{ padding: 40 }}>

      <h2>Voice Assistant Test</h2>
      {replyMessage && <p>Assistant: {replyMessage}</p>}

      {!isRecording ? (

        <button onClick={startRecording}>
          Start Talking
        </button>

      ) : (

        <button onClick={stopRecording}>
          Stop Talking
        </button>

      )}

    </div>
    );
}