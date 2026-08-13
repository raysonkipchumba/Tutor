import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FirebaseService } from './services/firebase';
import { CurriculumService, Course, Lesson } from './services/curriculum';
import { EvaluatorService } from './services/evaluator';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  public firebase = inject(FirebaseService);
  public curriculum = inject(CurriculumService);
  public evaluator = inject(EvaluatorService);

  // View state signals
  public activeTab = signal<'dashboard' | 'courses' | 'classroom' | 'auth'>('dashboard');
  
  // Classroom signals
  public selectedCourse = signal<Course | null>(null);
  public selectedLesson = signal<Lesson | null>(null);
  public userCode = signal<string>('');
  public consoleInput = signal<string>('');
  public consoleOutput = signal<string>('');
  public consoleError = signal<string>('');

  // Socratic Quiz states
  public selectedAnswers = signal<Record<string, number>>({});
  public quizSubmitted = signal<boolean>(false);

  // Coding Challenge evaluation states
  public challengeStatus = signal<'NOT_STARTED' | 'ATTEMPTED' | 'PASSED' | 'MASTERED'>('NOT_STARTED');
  public challengeFeedback = signal<string>('');

  // AI Tutor chat drawer state
  public tutorOpen = signal<boolean>(false);
  public tutorInput = signal<string>('');
  public tutorMessages = signal<{ sender: 'student' | 'tutor'; text: string }[]>([
    { sender: 'tutor', text: 'Hallo! I am your AI Socratic Tutor. Ask me any conceptual questions, request hints, or paste error messages, and we will solve them together!' }
  ]);
  public tutorLoading = signal<boolean>(false);

  // Auth Form signals (No NgModel pattern)
  public authEmail = signal<string>('');
  public authPassword = signal<string>('');
  public authName = signal<string>('');
  public isLoginMode = signal<boolean>(true);
  public authError = signal<string>('');

  // Search signal
  public searchKeyword = signal<string>('');

  // Filter courses by search keyword
  public filteredCourses = computed(() => {
    const kw = this.searchKeyword().toLowerCase().trim();
    const all = this.curriculum.getCourses();
    if (!kw) return all;
    return all.filter(c => 
      c.title.toLowerCase().includes(kw) || 
      c.description.toLowerCase().includes(kw)
    );
  });

  // Dynamic user profile signal with guest fallback
  public currentProfile = computed(() => {
    const dbProfile = this.firebase.userProfile();
    if (dbProfile) return dbProfile;
    return this.firebase.getLocalGuestProfile();
  });

  // Calculate overall course progress percentage
  getCourseProgress(course: Course): number {
    const profile = this.currentProfile();
    const lessonIds = course.chapters.flatMap(ch => ch.lessons.map(l => l.id));
    if (lessonIds.length === 0) return 0;
    const completedCount = lessonIds.filter(id => profile.completedLessons.includes(id)).length;
    return Math.round((completedCount / lessonIds.length) * 100);
  }

  // Effect to automatically synchronize editor with lesson starter code
  constructor() {
    effect(() => {
      const lesson = this.selectedLesson();
      if (lesson) {
        // If there's a challenge, load its starter code, otherwise look for interactive block or clear
        const challengeCode = lesson.challenge?.starterCode;
        if (challengeCode) {
          this.userCode.set(challengeCode);
        } else {
          const interactiveBlock = lesson.contentBlocks.find(b => b.type === 'interactive');
          this.userCode.set(interactiveBlock?.starterCode || '# Enter your Python code here\n');
        }
        this.clearConsole();
        this.selectedAnswers.set({});
        this.quizSubmitted.set(false);
        this.challengeFeedback.set('');
        
        // Reset challenge status from user profile
        const profile = this.currentProfile();
        if (lesson.challenge) {
          this.challengeStatus.set(profile.challengeAttempts[lesson.challenge.id] || 'NOT_STARTED');
        }
      }
    });

    // Auto-save guest profile changes back to local storage
    effect(() => {
      const prof = this.currentProfile();
      if (prof.uid === 'guest') {
        localStorage.setItem('guest_profile', JSON.stringify(prof));
      }
    });
  }

  selectCourse(course: Course) {
    this.selectedCourse.set(course);
    // Auto-select first lesson if available
    const firstChapter = course.chapters[0];
    if (firstChapter && firstChapter.lessons.length > 0) {
      this.selectedLesson.set(firstChapter.lessons[0]);
    }
    this.activeTab.set('classroom');
  }

  selectLesson(lesson: Lesson, course: Course) {
    this.selectedCourse.set(course);
    this.selectedLesson.set(lesson);
    this.activeTab.set('classroom');
  }

  clearConsole() {
    this.consoleOutput.set('');
    this.consoleError.set('');
  }

  runCode() {
    this.clearConsole();
    const code = this.userCode();

    // Prepare inputs if required by test cases or manual prompt
    const inputs = this.consoleInput().split('\n');

    const result = this.evaluator.evaluatePython(code, inputs);
    
    if (result.success) {
      this.consoleOutput.set(result.output || '(No console output)');
    } else {
      this.consoleError.set(result.error || 'Evaluation failed.');
    }
  }

  submitChallenge() {
    const lesson = this.selectedLesson();
    if (!lesson || !lesson.challenge) return;

    this.clearConsole();
    const code = this.userCode();
    const challenge = lesson.challenge;
    
    let allPassed = true;
    let feedback = '';

    for (const test of challenge.testCases) {
      const inputs = test.input ? test.input.split('\n') : [];
      const result = this.evaluator.evaluatePython(code, inputs);

      if (!result.success) {
        allPassed = false;
        feedback += `❌ Test Failed: "${test.description}"\nError: ${result.error}\n\n`;
        break;
      }

      if (result.output !== test.expectedOutput) {
        allPassed = false;
        feedback += `❌ Test Failed: "${test.description}"\nExpected:\n${test.expectedOutput}Got:\n${result.output}\n\n`;
        break;
      }
    }

    if (allPassed) {
      this.challengeStatus.set('MASTERED');
      this.challengeFeedback.set('🎉 CONGRATULATIONS! All test cases passed perfectly. You earned 100 XP!');
      this.firebase.updateChallengeAttempt(challenge.id, 'MASTERED');
      this.firebase.updateUserXP(100);
      this.firebase.completeLesson(lesson.id);
    } else {
      this.challengeStatus.set('ATTEMPTED');
      this.challengeFeedback.set(feedback + '💡 Need a hint? Tap the Socratic Tutor in the sidebar for a guided hint.');
      this.firebase.updateChallengeAttempt(challenge.id, 'ATTEMPTED');
    }
  }

  // Socratic Quiz Handlers
  onSelectOption(questionId: string, optionIdx: number) {
    this.selectedAnswers.update(curr => ({
      ...curr,
      [questionId]: optionIdx
    }));
  }

  submitQuiz() {
    this.quizSubmitted.set(true);
    const lesson = this.selectedLesson();
    if (!lesson || !lesson.quiz) return;

    // Calculate score
    let correctCount = 0;
    lesson.quiz.forEach(q => {
      if (this.selectedAnswers()[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / lesson.quiz.length) * 100);
    this.firebase.saveQuizHighScore(lesson.id, finalScore);
    
    if (finalScore >= 70) {
      this.firebase.completeLesson(lesson.id);
    }
  }

  toggleBookmark() {
    const lesson = this.selectedLesson();
    if (lesson) {
      this.firebase.toggleBookmark(lesson.id);
    }
  }

  markLessonComplete() {
    const lesson = this.selectedLesson();
    if (lesson) {
      this.firebase.completeLesson(lesson.id);
    }
  }

  // Secure API Socratic tutor communication
  async sendTutorMessage() {
    const msg = this.tutorInput().trim();
    if (!msg) return;

    // Add student message immediately
    this.tutorMessages.update(curr => [...curr, { sender: 'student', text: msg }]);
    this.tutorInput.set('');
    this.tutorLoading.set(true);

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonTitle: this.selectedLesson()?.title || 'Dashboard Overview',
          userCode: this.userCode(),
          studentMessage: msg,
          errorState: this.consoleError()
        })
      });

      const data = await response.json();
      if (data.reply) {
        this.tutorMessages.update(curr => [...curr, { sender: 'tutor', text: data.reply }]);
      } else if (data.error) {
        this.tutorMessages.update(curr => [...curr, { sender: 'tutor', text: `⚠️ ${data.error}` }]);
      }
    } catch (err: unknown) {
      console.error(err);
      this.tutorMessages.update(curr => [...curr, { sender: 'tutor', text: '⚠️ Connection lost. Ensure your development server is running.' }]);
    } finally {
      this.tutorLoading.set(false);
    }
  }

  // Manual Bindings for Auth Forms (No NgModel Directive rule)
  setAuthEmail(event: Event) { this.authEmail.set((event.target as HTMLInputElement).value); }
  setAuthPassword(event: Event) { this.authPassword.set((event.target as HTMLInputElement).value); }
  setAuthName(event: Event) { this.authName.set((event.target as HTMLInputElement).value); }
  setSearchKeyword(event: Event) { this.searchKeyword.set((event.target as HTMLInputElement).value); }

  async handleAuth() {
    this.authError.set('');
    const email = this.authEmail().trim();
    const password = this.authPassword();
    const name = this.authName().trim();

    if (!email || !password) {
      this.authError.set('Please fill out all required fields.');
      return;
    }

    try {
      if (this.isLoginMode()) {
        await this.firebase.login(email, password);
      } else {
        if (!name) {
          this.authError.set('Display Name is required for registration.');
          return;
        }
        await this.firebase.signUp(email, password, name);
      }
      this.activeTab.set('dashboard');
      // Clear forms
      this.authEmail.set('');
      this.authPassword.set('');
      this.authName.set('');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.';
      this.authError.set(errMsg);
    }
  }

  async handleGoogleAuth() {
    this.authError.set('');
    try {
      await this.firebase.loginWithGoogle();
      this.activeTab.set('dashboard');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Google authentication failed.';
      this.authError.set(errMsg);
    }
  }

  nextLesson() {
    const course = this.selectedCourse();
    const lesson = this.selectedLesson();
    if (!course || !lesson) return;

    const allLessons = course.chapters.flatMap(ch => ch.lessons);
    const currIdx = allLessons.findIndex(l => l.id === lesson.id);
    if (currIdx > -1 && currIdx < allLessons.length - 1) {
      this.selectedLesson.set(allLessons[currIdx + 1]);
    }
  }

  prevLesson() {
    const course = this.selectedCourse();
    const lesson = this.selectedLesson();
    if (!course || !lesson) return;

    const allLessons = course.chapters.flatMap(ch => ch.lessons);
    const currIdx = allLessons.findIndex(l => l.id === lesson.id);
    if (currIdx > 0) {
      this.selectedLesson.set(allLessons[currIdx - 1]);
    }
  }
}
