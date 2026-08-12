import { Injectable } from '@angular/core';

export interface ContentBlock {
  type: 'heading' | 'paragraph' | 'code' | 'example' | 'note' | 'warning' | 'summary' | 'interactive';
  text?: string;
  code?: string;
  language?: string;
  explanation?: string;
  starterCode?: string;
  expectedOutput?: string;
  placeholder?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index of option
  explanation: string;
}

export interface CodingChallenge {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  testCases: { input?: string; expectedOutput: string; description: string }[];
  hint: string;
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  objectives: string[];
  contentBlocks: ContentBlock[];
  quiz?: QuizQuestion[];
  challenge?: CodingChallenge;
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedHours: number;
  thumbnail: string; // Tailwind icon or name
  chapters: Chapter[];
}

@Injectable({
  providedIn: 'root'
})
export class CurriculumService {
  private courses: Course[] = [
    {
      id: 'python',
      title: 'Python Programming',
      slug: 'python',
      description: 'Master Python fundamentals from absolute basics to data science, following the comprehensive OpenStax curriculum.',
      difficulty: 'Beginner',
      estimatedHours: 45,
      thumbnail: 'terminal',
      chapters: [
        {
          id: 'py-ch1',
          title: 'Chapter 1: Statements & Foundations',
          description: 'Learn the basic statements, variables, input/output, and Python history.',
          lessons: [
            {
              id: 'py-1-1',
              slug: 'python-background',
              title: '1.1 Background & History',
              estimatedMinutes: 8,
              objectives: [
                'Understand what a computer program is.',
                'Know who created Python and where its name comes from.',
                'Explain why Python is so popular today.'
              ],
              contentBlocks: [
                {
                  type: 'heading',
                  text: 'What is a Computer Program?'
                },
                {
                  type: 'paragraph',
                  text: 'A computer is an electronic device that stores and processes information. This includes your smartphone, tablet, laptop, and server. A program is a sequence of precise instructions that a computer executes to perform tasks.'
                },
                {
                  type: 'note',
                  text: 'Guido van Rossum started working on Python in 1989 at CWI in the Netherlands as a hobby. He named the language after the British comedy group "Monty Python\'s Flying Circus".'
                },
                {
                  type: 'paragraph',
                  text: 'Python is a high-level, interpreted language. This means the code is designed to be easily read by humans, and is translated into machine code line-by-line while running, rather than compiled all at once.'
                },
                {
                  type: 'example',
                  text: 'Compare Python vs Java for printing "Hello, World!":',
                  code: '# Python (Concise)\nprint("Hello, World!")',
                  language: 'python'
                },
                {
                  type: 'example',
                  text: 'Java equivalent (5 lines of boilerplates):',
                  code: 'public class Hello {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
                  language: 'java'
                }
              ],
              quiz: [
                {
                  id: 'py-q1-1-1',
                  question: 'Who created the Python programming language?',
                  options: [
                    'Dennis Ritchie',
                    'Guido van Rossum',
                    'Bjarne Stroustrup',
                    'James Gosling'
                  ],
                  correctAnswer: 1,
                  explanation: 'Guido van Rossum created Python as a hobby project in 1989/1990.'
                },
                {
                  id: 'py-q1-1-2',
                  question: 'Why was the language named "Python"?',
                  options: [
                    'After a species of large, non-venomous snakes',
                    'After the creator\'s favorite comedy group, Monty Python',
                    'It is an acronym for Private Youth Technology Network',
                    'After the Roman god of computing'
                  ],
                  correctAnswer: 1,
                  explanation: 'Guido van Rossum was a fan of the British comedy group Monty Python\'s Flying Circus.'
                }
              ]
            },
            {
              id: 'py-1-2',
              slug: 'python-input-output',
              title: '1.2 Input and Output',
              estimatedMinutes: 12,
              objectives: [
                'Display output using the print() function.',
                'Customize output using sep and end options.',
                'Obtain user input using the input() function.'
              ],
              contentBlocks: [
                {
                  type: 'heading',
                  text: 'The print() Function'
                },
                {
                  type: 'paragraph',
                  text: 'The print() function outputs values to the console. You can print multiple values separated by commas. By default, print() separates items with spaces and adds a newline at the end.'
                },
                {
                  type: 'code',
                  code: 'print("Today", "is", "Monday")\n# Outputs: Today is Monday',
                  language: 'python'
                },
                {
                  type: 'heading',
                  text: 'Customizing separators and endings'
                },
                {
                  type: 'paragraph',
                  text: 'You can use the sep argument to change the default space separator, and the end argument to change the ending character (instead of a newline).'
                },
                {
                  type: 'example',
                  text: 'Using sep and end options:',
                  code: 'print("555", "0123", sep="-")\nprint("Hello", end="!!")\nprint("World")',
                  language: 'python',
                  explanation: 'This will output: 555-0123 on line one, and Hello!!World on line two.'
                },
                {
                  type: 'heading',
                  text: 'The input() Function'
                },
                {
                  type: 'paragraph',
                  text: 'To make your programs interactive, you can retrieve input from the user using the input() function. You can optionally provide a prompt string.'
                },
                {
                  type: 'interactive',
                  explanation: 'Modify the code below and run it to see how output and input work!',
                  starterCode: 'name = input("Please enter your name: ")\nprint("Nice to meet you,", name, sep=" ~ ", end="!\\n")',
                  expectedOutput: 'Please enter your name: Sophia\nNice to meet you, ~ Sophia!'
                }
              ],
              quiz: [
                {
                  id: 'py-q1-2-1',
                  question: 'What is the output of print("Sun", "Moon", sep="*")?',
                  options: [
                    'Sun Moon*',
                    'Sun*Moon',
                    'Sun Moon',
                    'Sun\nMoon'
                  ],
                  correctAnswer: 1,
                  explanation: 'The sep parameter specifies the string placed between values, printing "Sun*Moon".'
                },
                {
                  id: 'py-q1-2-2',
                  question: 'By default, what character does the print() function append at the end of its output?',
                  options: [
                    'A space',
                    'A tab',
                    'A newline character (\\n)',
                    'Nothing'
                  ],
                  correctAnswer: 2,
                  explanation: 'By default, print() appends a newline character, so subsequent prints start on a new line.'
                }
              ],
              challenge: {
                id: 'py-c1-2',
                title: 'Print formatted phone numbers',
                description: 'Write a program that takes three pieces of input: an area code, prefix, and line number, and prints them in phone format: (area_code) prefix-line_number. Ex: if inputs are "864", "555", "0199", output must be: (864) 555-0199',
                starterCode: 'area = input()\nprefix = input()\nline = input()\n# Write your print statement below\n',
                testCases: [
                  {
                    input: '864\n555\n0199',
                    expectedOutput: '(864) 555-0199\n',
                    description: 'Check format with (864) 555-0199'
                  }
                ],
                hint: 'Use the print statement with sep="", or concatenate the strings using "+". Remember to match parentheses and hyphen.'
              }
            }
          ]
        },
        {
          id: 'py-ch2',
          title: 'Chapter 2: Expressions & Operations',
          description: 'Master math operations, floor division, modulo, formatting, and the math module.',
          lessons: [
            {
              id: 'py-2-1',
              slug: 'python-expressions',
              title: '2.1 Operators & Dividing Integers',
              estimatedMinutes: 10,
              objectives: [
                'Use arithmetic operators in Python.',
                'Differentiate between true division (/), floor division (//), and modulo (%).',
                'Understand operator precedence.'
              ],
              contentBlocks: [
                {
                  type: 'heading',
                  text: 'Basic Math Operators'
                },
                {
                  type: 'paragraph',
                  text: 'Python supports addition (+), subtraction (-), multiplication (*), and exponentiation (**).'
                },
                {
                  type: 'code',
                  code: 'print(2 ** 3) # Exponentiation (2 raised to power 3) prints 8\nprint(1 + 2 * 3) # Operator precedence evaluates multiplication first: prints 7',
                  language: 'python'
                },
                {
                  type: 'heading',
                  text: 'Three Types of Division'
                },
                {
                  type: 'paragraph',
                  text: '1. True division (/) always returns a floating-point number.\n2. Floor division (//) rounds down to the nearest integer quotient.\n3. Modulo (%) calculates the remainder of division.'
                },
                {
                  type: 'example',
                  text: 'Compare division behaviors:',
                  code: 'print(7 / 4)   # Output: 1.75 (Float)\nprint(7 // 4)  # Output: 1 (Floor integer)\nprint(7 % 4)   # Output: 3 (Remainder)',
                  language: 'python'
                },
                {
                  type: 'interactive',
                  explanation: 'Experiment with floor division and modulo. Enter different integers to see quotients and remainders!',
                  starterCode: 'num = 193\nmeters = num // 100\ncentimeters = num % 100\nprint("Meters:", meters)\nprint("Centimeters:", centimeters)',
                  expectedOutput: 'Meters: 1\nCentimeters: 93'
                }
              ],
              quiz: [
                {
                  id: 'py-q2-1-1',
                  question: 'What is the output of 13 // 5 in Python?',
                  options: [
                    '2.6',
                    '2',
                    '3',
                    'Error'
                  ],
                  correctAnswer: 1,
                  explanation: 'Floor division rounds down to the nearest integer, so 13 // 5 is 2.'
                },
                {
                  id: 'py-q2-1-2',
                  question: 'What operator is used for exponentiation (raising to a power)?',
                  options: [
                    '^',
                    '*',
                    '**',
                    'pow'
                  ],
                  correctAnswer: 2,
                  explanation: 'The double asterisk (**) is the exponentiation operator in Python.'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'webdev',
      title: 'HTML & CSS Design',
      slug: 'webdev',
      description: 'Learn standard markup and visual designs to craft elegant, responsive landing pages and user interfaces.',
      difficulty: 'Beginner',
      estimatedHours: 20,
      thumbnail: 'palette',
      chapters: [
        {
          id: 'web-ch1',
          title: 'HTML Foundations',
          description: 'Unlock structured documents, standard semantic elements, and text links.',
          lessons: [
            {
              id: 'web-1-1',
              slug: 'html-basics',
              title: 'Structure of an HTML Page',
              estimatedMinutes: 10,
              objectives: [
                'Understand what HTML is.',
                'Identify standard document tags.',
                'Render paragraphs and headings.'
              ],
              contentBlocks: [
                {
                  type: 'heading',
                  text: 'What is HTML?'
                },
                {
                  type: 'paragraph',
                  text: 'HTML stands for HyperText Markup Language. It defines the skeletal structure of all web pages.'
                },
                {
                  type: 'code',
                  code: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My First Page</title>\n</head>\n<body>\n  <h1>Welcome to Web Dev!</h1>\n  <p>HTML is easy to learn.</p>\n</body>\n</html>',
                  language: 'html'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'javascript',
      title: 'JavaScript Systems',
      slug: 'javascript',
      description: 'Learn modern ES6+ JavaScript variables, execution flow, arrow functions, and arrays.',
      difficulty: 'Beginner',
      estimatedHours: 25,
      thumbnail: 'javascript',
      chapters: [
        {
          id: 'js-ch1',
          title: 'JS Variables & Functions',
          description: 'Understand let/const, execution scope, and function declarations.',
          lessons: [
            {
              id: 'js-1-1',
              slug: 'js-foundations',
              title: 'Variables & Constants',
              estimatedMinutes: 12,
              objectives: [
                'Declare variables using let and const.',
                'Differentiate var, let, and const.'
              ],
              contentBlocks: [
                {
                  type: 'heading',
                  text: 'Modern Declarations'
                },
                {
                  type: 'paragraph',
                  text: 'Always prefer let and const over var. Const represents variables that cannot be reassigned.'
                },
                {
                  type: 'code',
                  code: 'const name = "Alice";\nlet score = 10;\nscore += 5;\nconsole.log(name, "has a score of", score);',
                  language: 'javascript'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'german',
      title: 'German Language Track',
      slug: 'german',
      description: 'Learn German technical and basic terminology, conversational structures, and grammar rules for developers.',
      difficulty: 'Beginner',
      estimatedHours: 15,
      thumbnail: 'translate',
      chapters: [
        {
          id: 'de-ch1',
          title: 'German Greetings & Intro',
          description: 'Basic introductions, vocabulary, and pronouns.',
          lessons: [
            {
              id: 'de-1-1',
              slug: 'de-greetings',
              title: 'Guten Tag! (Greetings)',
              estimatedMinutes: 10,
              objectives: [
                'Learn basic greetings.',
                'Introduce yourself in German.'
              ],
              contentBlocks: [
                {
                  type: 'heading',
                  text: 'Begrüßung (Greetings)'
                },
                {
                  type: 'paragraph',
                  text: 'German is an elegant and highly structured language. Here are some basic phrases:\n- Hallo! (Hello!)\n- Guten Morgen! (Good morning!)\n- Guten Tag! (Good day!)\n- Wie geht es dir? (How are you?)'
                },
                {
                  type: 'example',
                  text: 'Introduce yourself:',
                  code: 'Ich heiße Rayson. Ich bin Softwareentwickler.\n(My name is Rayson. I am a software developer.)'
                }
              ],
              quiz: [
                {
                  id: 'de-q1',
                  question: 'What is the German phrase for "Good morning"?',
                  options: [
                    'Guten Tag',
                    'Guten Morgen',
                    'Hallo',
                    'Gute Nacht'
                  ],
                  correctAnswer: 1,
                  explanation: '"Guten Morgen" is "Good morning", used until about 11 AM.'
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  getCourses(): Course[] {
    return this.courses;
  }

  getCourseBySlug(slug: string): Course | undefined {
    return this.courses.find(c => c.slug === slug);
  }

  getLessonBySlug(courseSlug: string, lessonSlug: string): { course: Course; chapter: Chapter; lesson: Lesson } | undefined {
    const course = this.getCourseBySlug(courseSlug);
    if (!course) return undefined;
    for (const chapter of course.chapters) {
      const lesson = chapter.lessons.find(l => l.slug === lessonSlug);
      if (lesson) {
        return { course, chapter, lesson };
      }
    }
    return undefined;
  }
}
