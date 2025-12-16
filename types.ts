
export type Language = 'ar' | 'en';

export enum GradeLevel {
  Grade1 = 'الصف الأول',
  Grade2 = 'الصف الثاني',
  Grade3 = 'الصف الثالث',
  Grade4 = 'الصف الرابع',
  Grade5 = 'الصف الخامس',
  Grade6 = 'الصف السادس',
}

export enum LearningMode {
  Explain = 'شرح درس',
  Experiment = 'تجربة / فيديو',
  Quiz = 'اختبار',
  Homework = 'تصحيح واجب',
}

export enum ScienceTopic {
  // Lower Primary (Grades 1-3)
  Senses = 'الحواس الخمس',
  LivingNeeds = 'عالم الحيوان والنبات',
  WeatherSeasons = 'الطقس والفصول',
  Materials = 'المواد من حولنا (صلب وسائل)',
  
  // Upper Primary (Grades 4-6)
  HumanBody = 'أسرار جسم الإنسان',
  SolarSystem = 'رحلة في الفضاء',
  EnergyElectricity = 'الكهرباء والطاقة',
  ForceMotion = 'القوة والحركة',
  Ecosystem = 'البيئة والسلاسل الغذائية',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string; // For generated images or user uploads
  images?: string[]; // For multiple generated images (e.g. Arabic & English versions)
  audioData?: string; // Base64 audio data
  isError?: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index
  explanation: string;
}

export interface AppState {
  currentView: 'welcome' | 'dashboard' | 'topic' | 'lesson' | 'quiz' | 'homework';
  grade: GradeLevel | null;
  mode: LearningMode | null;
  topic: ScienceTopic | null;
  language: Language;
}
