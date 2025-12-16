import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import Button from './components/Button';
import TutorCharacter from './components/TutorCharacter';
import { GradeLevel, LearningMode, ScienceTopic, AppState, ChatMessage, QuizQuestion, Language } from './types';
import { explainLesson, generateLessonImages, correctHomework, generateQuiz, textToSpeech, generateVideoScript, blobToBase64 } from './services/geminiService';

// --- UI Translations ---
const translations = {
  ar: {
    welcomeTitle: "أهلاً بك في المدرس الذكي! 👋",
    welcomeSubtitle: "منهج العلوم العام المبسط للمرحلة الابتدائية",
    dashboardWelcome: (grade: string) => `مرحباً بطل ${grade}!`,
    dashboardSub: "ماذا تريد أن تتعلم اليوم؟",
    btnExplain: "🎧 شرح درس",
    btnStory: "🧪 قصة علمية",
    btnQuiz: "✏️ اختبار",
    btnHomework: "📸 تصحيح واجب",
    topicTitle: (grade: string) => `مواضيع ${grade} 👇`,
    tutorName: "المدرس الذكي",
    statusReady: "مستعد للمساعدة",
    statusTalking: "يتحدث الآن...",
    statusLoadingAudio: "جاري تحضير الصوت... ⏳",
    inputPlaceholder: "اسأل المدرس الذكي...",
    btnImage: "🎨 وريني رسمة",
    btnSimplify: "💡 بسط الشرح",
    uploadText: "اضغط هنا لرفع صورة الواجب",
    uploadIcon: "📸",
    loading: "جاري التحميل...",
    micError: "الرجاء السماح بالميكروفون",
    initLesson: "جاري تحضير الدرس... ⏳",
    quizPrep: "جاري تحضير الاختبار... 🧠",
    quizQuestion: "السؤال",
    quizPoints: "النقاط",
    homeworkPrompt: "أهلاً يا بطل! 📸 صور لي الواجب وارفعه هنا وسأقوم بمساعدتك.",
    imageGenMsg: "جاري رسم صورتين (عربي وإنجليزي)... 🎨",
    imageDoneMsg: "تفضل، هذه نسخة بالعربية وأخرى بالإنجليزية!",
    imageFailMsg: "عذراً، لم أستطع الرسم الآن.",
    uploadedMsg: "قام برفع صورة",
    stopAudio: "إيقاف الصوت 🔇",
    listen: "استماع"
  },
  en: {
    welcomeTitle: "Welcome to Smart Tutor! 👋",
    welcomeSubtitle: "General Science Curriculum for Primary School",
    dashboardWelcome: (grade: string) => `Hello ${grade} Champion!`,
    dashboardSub: "What do you want to learn today?",
    btnExplain: "🎧 Explain Lesson",
    btnStory: "🧪 Science Story",
    btnQuiz: "✏️ Take Quiz",
    btnHomework: "📸 Check Homework",
    topicTitle: (grade: string) => `${grade} Topics 👇`,
    tutorName: "Smart Tutor",
    statusReady: "Ready to help",
    statusTalking: "Speaking...",
    statusLoadingAudio: "Preparing voice... ⏳",
    inputPlaceholder: "Ask Smart Tutor...",
    btnImage: "🎨 Show Image",
    btnSimplify: "💡 Simplify",
    uploadText: "Click here to upload homework",
    uploadIcon: "📸",
    loading: "Loading...",
    micError: "Please allow microphone access",
    initLesson: "Preparing the lesson... ⏳",
    quizPrep: "Preparing the quiz... 🧠",
    quizQuestion: "Question",
    quizPoints: "Score",
    homeworkPrompt: "Hi Hero! 📸 Snap a picture of your homework and upload it here.",
    imageGenMsg: "Drawing two images (Arabic & English)... 🎨",
    imageDoneMsg: "Here you go! Arabic and English versions.",
    imageFailMsg: "Sorry, couldn't draw right now.",
    uploadedMsg: "Uploaded an image",
    stopAudio: "Stop Audio 🔇",
    listen: "Listen"
  }
};

// Map Grades to English text if needed
const gradeMap: Record<GradeLevel, string> = {
    [GradeLevel.Grade1]: "Grade 1",
    [GradeLevel.Grade2]: "Grade 2",
    [GradeLevel.Grade3]: "Grade 3",
    [GradeLevel.Grade4]: "Grade 4",
    [GradeLevel.Grade5]: "Grade 5",
    [GradeLevel.Grade6]: "Grade 6",
};

// Map Topics to English text
const topicMap: Record<ScienceTopic, string> = {
    [ScienceTopic.Senses]: "The Five Senses",
    [ScienceTopic.LivingNeeds]: "Animals & Plants",
    [ScienceTopic.WeatherSeasons]: "Weather & Seasons",
    [ScienceTopic.Materials]: "Materials Around Us",
    [ScienceTopic.HumanBody]: "Human Body Secrets",
    [ScienceTopic.SolarSystem]: "Journey to Space",
    [ScienceTopic.EnergyElectricity]: "Energy & Electricity",
    [ScienceTopic.ForceMotion]: "Force & Motion",
    [ScienceTopic.Ecosystem]: "Ecosystems",
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentView: 'welcome',
    grade: null,
    mode: null,
    topic: null,
    language: 'ar' // Default language
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isLessonStartRef = useRef(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Helper to get current text
  const T = translations[state.language];

  const getDisplayGrade = (g: GradeLevel | null) => {
    if (!g) return "";
    return state.language === 'en' ? gradeMap[g] : g;
  };

  const getDisplayTopic = (t: ScienceTopic | null) => {
    if (!t) return "";
    return state.language === 'en' ? topicMap[t] : t;
  };

  const getTopicsForGrade = (grade: GradeLevel | null): ScienceTopic[] => {
    if (!grade) return [];
    const lowerPrimary = [GradeLevel.Grade1, GradeLevel.Grade2, GradeLevel.Grade3];
    if (lowerPrimary.includes(grade)) {
      return [ScienceTopic.Senses, ScienceTopic.LivingNeeds, ScienceTopic.WeatherSeasons, ScienceTopic.Materials];
    } else {
      return [ScienceTopic.HumanBody, ScienceTopic.SolarSystem, ScienceTopic.EnergyElectricity, ScienceTopic.ForceMotion, ScienceTopic.Ecosystem];
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  useEffect(() => {
    if (isLessonStartRef.current) {
        // Force scroll to top for new lessons
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = 0;
            }
        }, 150);
        isLessonStartRef.current = false;
    } else {
        // Normal scroll to bottom for chat flow
        scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) audioContextRef.current.close();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop();
    };
  }, []);

  const handleToggleLanguage = () => {
    stopAudio();
    setState(prev => ({ ...prev, language: prev.language === 'ar' ? 'en' : 'ar' }));
  };

  const handleGradeSelect = (grade: GradeLevel) => {
    setState(prev => ({ ...prev, grade, currentView: 'dashboard' }));
  };

  const handleModeSelect = (mode: LearningMode) => {
    setState(prev => ({ ...prev, mode }));
    if (mode === LearningMode.Homework) {
      setState(prev => ({ ...prev, currentView: 'homework' }));
      const msgText = T.homeworkPrompt;
      const msgId = '1';
      setMessages([{ id: msgId, role: 'model', text: msgText }]);
      playTextAsAudio(msgText);
    } else {
      setState(prev => ({ ...prev, currentView: 'topic' }));
    }
  };

  // --- Audio ---
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const playTextAsAudio = async (text: string, messageId?: string) => {
    stopAudio();
    setIsAudioLoading(true);

    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const base64 = await textToSpeech(text);
        
        setIsAudioLoading(false);

        if (!base64) return;

        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => {
           setIsSpeaking(false);
           sourceNodeRef.current = null;
        };
        
        setIsSpeaking(true);
        source.start();
        sourceNodeRef.current = source;
    } catch (e) {
        console.error("Audio playback failed", e);
        setIsAudioLoading(false);
        setIsSpeaking(false);
    }
  };

  const stopAudio = () => {
      if (sourceNodeRef.current) {
          try { sourceNodeRef.current.stop(); } catch (e) {}
          sourceNodeRef.current = null;
      }
      setIsSpeaking(false);
      setIsAudioLoading(false);
  };

  // --- Recording ---
  const handleStartRecording = async () => {
    try {
        stopAudio();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
             const mimeType = recorder.mimeType || 'audio/webm';
             const blob = new Blob(audioChunksRef.current, { type: mimeType });
             stream.getTracks().forEach(t => t.stop());
             await handleSendAudio(blob);
        };
        recorder.start();
        setIsRecording(true);
    } catch (e) {
        alert(T.micError);
    }
  };

  const handleStopRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleSendAudio = async (blob: Blob) => {
      const userMsgId = Date.now().toString();
      const userMsg: ChatMessage = { id: userMsgId, role: 'user', text: '🎤 ...' };
      setMessages(prev => [...prev, userMsg]);
      setIsLoading(true);
      try {
          const base64 = await blobToBase64(blob);
          const response = await explainLesson(state.grade!, state.topic!, state.language, { audioData: base64, mimeType: blob.type });
          const modelMsgId = (Date.now() + 1).toString();
          setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: response }]);
          playTextAsAudio(response, modelMsgId);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  // --- Actions ---
  const handleTopicSelect = async (topic: ScienceTopic) => {
    setState(prev => ({ ...prev, topic, currentView: prev.mode === LearningMode.Quiz ? 'quiz' : 'lesson' }));
    
    if (state.mode === LearningMode.Explain) {
      setIsLoading(true);
      setMessages([{ id: 'init', role: 'model', text: T.initLesson }]);
      const explanation = await explainLesson(state.grade!, topic, state.language);
      const msgId = Date.now().toString();
      
      isLessonStartRef.current = true; // Mark as new lesson start for scrolling logic
      setMessages([{ id: msgId, role: 'model', text: explanation }]);
      
      setIsLoading(false);
      playTextAsAudio(explanation, msgId);
    } else if (state.mode === LearningMode.Experiment) {
      setIsLoading(true);
      const script = await generateVideoScript(topic, state.language, state.grade!);
      const msgId = Date.now().toString();
      
      isLessonStartRef.current = true; // Mark as new lesson start for scrolling logic
      setMessages([{ id: msgId, role: 'model', text: script }]);
      
      setIsLoading(false);
      playTextAsAudio(script, msgId);
    } else if (state.mode === LearningMode.Quiz) {
      startQuiz(state.grade!, topic);
    }
  };

  const startQuiz = async (grade: GradeLevel, topic: ScienceTopic) => {
    setIsLoading(true);
    const questions = await generateQuiz(grade, topic, state.language);
    setQuizQuestions(questions);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setIsLoading(false);
  };

  const handleQuizAnswer = (optionIndex: number) => {
    const currentQ = quizQuestions[currentQuizIndex];
    if (optionIndex === currentQ.correctAnswer) {
      setQuizScore(prev => prev + 1);
    }
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      setState(prev => ({ ...prev, currentView: 'lesson' })); 
      const resultText = state.language === 'en' 
        ? `Great job! You finished the quiz. Your score: ${quizScore + (optionIndex === currentQ.correctAnswer ? 1 : 0)} / ${quizQuestions.length}. 🎉`
        : `ممتاز! لقد أنهيت الاختبار. نتيجتك هي ${quizScore + (optionIndex === currentQ.correctAnswer ? 1 : 0)} من ${quizQuestions.length}. 🎉`;
      const msgId = 'quiz-end';
      setMessages([{ id: msgId, role: 'model', text: resultText }]);
      playTextAsAudio(resultText, msgId);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    stopAudio();
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', text: input }]);
    setInput('');
    setIsLoading(true);
    const response = await explainLesson(state.grade!, state.topic!, state.language, input);
    const modelMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: response }]);
    setIsLoading(false);
    playTextAsAudio(response, modelMsgId);
  };

  const handleRequestImage = async () => {
     setIsLoading(true);
     const tempId = Date.now().toString();
     setMessages(prev => [...prev, { id: tempId, role: 'model', text: T.imageGenMsg }]);
     const images = await generateLessonImages(getDisplayTopic(state.topic!) + " " + (input || ""));
     if (images.length > 0) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: T.imageDoneMsg, images: images } : m));
     } else {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: T.imageFailMsg } : m));
     }
     setIsLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopAudio();
    setIsLoading(true);
    try {
      const base64 = await blobToBase64(file);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'user', 
        text: T.uploadedMsg, 
        imageUrl: `data:${file.type};base64,${base64}` 
      }]);
      const feedback = await correctHomework(state.grade!, state.language, base64, file.type);
      const modelMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: feedback }]);
      playTextAsAudio(feedback, modelMsgId);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  // --- Views ---
  const WelcomeView = () => (
    <div className="flex flex-col gap-6 text-center animate-fadeIn">
      <TutorCharacter emotion="happy" size="lg" />
      <div>
        <h2 className="text-2xl font-bold mb-2 text-blue-600">{T.welcomeTitle}</h2>
        <p className="text-gray-500">{T.welcomeSubtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Object.values(GradeLevel).map((grade) => (
          <Button key={grade} variant="outline" onClick={() => handleGradeSelect(grade)}>
            {getDisplayGrade(grade)}
          </Button>
        ))}
      </div>
    </div>
  );

  const DashboardView = () => (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-2xl">
        <TutorCharacter emotion="happy" size="sm" />
        <div>
          <h3 className="font-bold text-blue-800">{T.dashboardWelcome(getDisplayGrade(state.grade!))}</h3>
          <p className="text-sm text-blue-600">{T.dashboardSub}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button variant="primary" size="lg" onClick={() => handleModeSelect(LearningMode.Explain)}>{T.btnExplain}</Button>
        <Button variant="secondary" size="lg" onClick={() => handleModeSelect(LearningMode.Experiment)}>{T.btnStory}</Button>
        <Button variant="accent" size="lg" onClick={() => handleModeSelect(LearningMode.Quiz)}>{T.btnQuiz}</Button>
        <Button variant="outline" size="lg" onClick={() => handleModeSelect(LearningMode.Homework)}>{T.btnHomework}</Button>
      </div>
    </div>
  );

  const TopicView = () => (
      <div className="flex flex-col gap-6 animate-fadeIn">
        <h2 className="text-xl font-bold text-center text-gray-700">{T.topicTitle(getDisplayGrade(state.grade!))}</h2>
        <div className="space-y-3">
          {getTopicsForGrade(state.grade).map((topic) => (
            <Button key={topic} variant="primary" className="w-full justify-between" onClick={() => handleTopicSelect(topic)}>
              <span>{getDisplayTopic(topic)}</span>
              <span>{state.language === 'ar' ? '👈' : '👉'}</span>
            </Button>
          ))}
        </div>
      </div>
  );

  const ChatView = () => (
    <div className="flex flex-col h-[calc(100vh-140px)]">
       <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm p-2 rounded-2xl mb-2 sticky top-0 z-10 border border-blue-50 shadow-sm shrink-0">
          <div className="flex items-center gap-2">
             <div className="transform scale-75 origin-right">
                <TutorCharacter emotion={isSpeaking ? 'talking' : (isLoading || isAudioLoading ? 'thinking' : 'happy')} size="sm" />
             </div>
             <div>
                <p className="font-bold text-blue-900 text-sm">{T.tutorName}</p>
                {isSpeaking ? (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <span className="animate-pulse">●</span> {T.statusTalking}
                    </span>
                ) : isAudioLoading ? (
                    <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                      <span className="animate-pulse">●</span> {T.statusLoadingAudio}
                    </span>
                ) : (
                    <span className="text-xs text-gray-400">{T.statusReady}</span>
                )}
             </div>
          </div>
          {isSpeaking && (
            <button onClick={stopAudio} className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-200 transition-colors">
              {T.stopAudio}
            </button>
          )}
       </div>

       <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 p-2 mb-4 scrollbar-hide scroll-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${
                (msg.images?.length) ? 'justify-center w-full' : (msg.role === 'user' ? 'justify-start' : 'justify-end')
            }`}>
               <div className={`${
                   (msg.images?.length) ? 'w-full' : `max-w-[95%] md:max-w-[85%] p-4 rounded-2xl shadow-sm ${
                        msg.role === 'user' ? 'bg-blue-100 text-blue-900 rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                    }`
               }`}>
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-col gap-6 w-full mt-2">
                        {msg.images.map((img, idx) => (
                            <div key={idx} className="relative w-full flex justify-center bg-slate-100 rounded-2xl border-4 border-white shadow-lg overflow-hidden group">
                                <img src={img} alt="Lesson Content" className="w-full h-auto max-h-[60vh] object-contain" onLoad={scrollToBottom} />
                                <div className="absolute top-3 right-3 bg-blue-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md backdrop-blur-sm z-10">
                                    {idx === 0 ? 'Arabic 🇸🇦' : 'English 🇺🇸'}
                                </div>
                            </div>
                        ))}
                    </div>
                  )}
                  {msg.text && (
                      <div className={`${(msg.images?.length) ? 'bg-white p-4 rounded-xl border border-blue-100 text-center mx-auto max-w-lg mt-4 shadow-sm' : ''}`}>
                         {!(msg.images?.length) && msg.imageUrl && (
                            <img src={msg.imageUrl} alt="Content" className="w-full h-auto rounded-xl mb-3 shadow-sm bg-gray-50" />
                         )}
                         <p className="whitespace-pre-wrap leading-relaxed text-lg">{msg.text}</p>
                         {msg.role === 'model' && !isSpeaking && (
                            <button onClick={() => playTextAsAudio(msg.text, msg.id)} className="mt-3 text-sm flex items-center justify-center gap-1 text-blue-600 font-bold hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg w-fit transition-colors mx-auto">
                            🔊 {msg.images ? T.listen : T.listen}
                            </button>
                         )}
                      </div>
                  )}
               </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-end">
               <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                  <span className="text-gray-400 text-sm animate-pulse">{T.loading}</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
       </div>

       {state.mode !== LearningMode.Homework && (
         <div className="bg-white p-3 rounded-2xl shadow-lg border border-gray-100 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={T.inputPlaceholder}
                className="flex-1 bg-gray-50 border-transparent focus:border-blue-300 focus:bg-white rounded-xl px-4 py-3 outline-none transition-all"
                disabled={isLoading}
              />
              <button
                className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isLoading}
              >
                {isRecording ? "🛑" : "🎤"}
              </button>
              <Button variant="primary" size="sm" onClick={handleSendMessage} disabled={!input || isLoading} className="rounded-xl">
                🚀
              </Button>
            </div>
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
               <button onClick={handleRequestImage} disabled={isLoading} className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg whitespace-nowrap hover:bg-yellow-200 border border-yellow-200">
                 {T.btnImage}
               </button>
               <button onClick={() => { setInput(state.language === 'en' ? 'Explain simpler' : 'اشرح لي بمثال أبسط'); handleSendMessage(); }} disabled={isLoading} className="text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-lg whitespace-nowrap hover:bg-green-200 border border-green-200">
                 {T.btnSimplify}
               </button>
            </div>
         </div>
       )}

       {state.mode === LearningMode.Homework && (
         <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 text-center shrink-0">
            <label className="cursor-pointer block">
               <div className="bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 rounded-xl p-6 transition-colors">
                  <span className="text-4xl block mb-2">{T.uploadIcon}</span>
                  <span className="text-blue-600 font-bold">{T.uploadText}</span>
               </div>
               <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={isLoading} />
            </label>
         </div>
       )}
    </div>
  );

  const QuizView = () => {
    if (isLoading || !quizQuestions.length) {
       return (
         <div className="flex flex-col items-center justify-center h-64 gap-4 animate-fadeIn">
            <TutorCharacter emotion="thinking" size="md" />
            <p className="text-xl text-blue-600 font-bold animate-pulse">{T.quizPrep}</p>
         </div>
       );
    }
    const currentQ = quizQuestions[currentQuizIndex];
    if (!currentQ) return null;
    return (
      <div className="flex flex-col gap-6 animate-fadeIn">
        <div className="bg-white p-6 rounded-3xl shadow-lg border-b-4 border-blue-100">
           <div className="flex justify-between items-center mb-4">
              <span className="text-blue-500 font-bold">{T.quizQuestion} {currentQuizIndex + 1} / {quizQuestions.length}</span>
              <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold">
                 {T.quizPoints}: {quizScore}
              </span>
           </div>
           <h3 className="text-xl font-bold mb-6 text-gray-800 leading-relaxed text-start">{currentQ.question}</h3>
           <div className="space-y-3">
             {currentQ.options.map((option, idx) => (
                <Button key={idx} variant="outline" className="w-full justify-start text-start" onClick={() => handleQuizAnswer(idx)}>
                  <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-3 font-bold text-sm shrink-0">{idx + 1}</span>
                  {option}
                </Button>
             ))}
           </div>
        </div>
      </div>
    );
  };

  const handleBack = () => {
    stopAudio();
    if (state.currentView === 'dashboard') setState(prev => ({ ...prev, currentView: 'welcome', grade: null }));
    else if (state.currentView === 'topic') setState(prev => ({ ...prev, currentView: 'dashboard', topic: null }));
    else if (state.currentView === 'lesson' || state.currentView === 'quiz') { setState(prev => ({ ...prev, currentView: 'topic' })); setMessages([]); }
    else if (state.currentView === 'homework') { setState(prev => ({ ...prev, currentView: 'dashboard', mode: null })); setMessages([]); }
  };

  return (
    <Layout 
        title={state.topic ? getDisplayTopic(state.topic) : (state.grade ? getDisplayGrade(state.grade) : undefined)} 
        showBack={state.currentView !== 'welcome'}
        onBack={handleBack}
        language={state.language}
        onToggleLanguage={handleToggleLanguage}
    >
        {state.currentView === 'welcome' && <WelcomeView />}
        {state.currentView === 'dashboard' && <DashboardView />}
        {state.currentView === 'topic' && <TopicView />}
        {(state.currentView === 'lesson' || state.currentView === 'homework') && <ChatView />}
        {state.currentView === 'quiz' && <QuizView />}
    </Layout>
  );
};

export default App;