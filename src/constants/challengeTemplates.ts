// ── Challenge Categories & Templates ────────────────────────────

export interface ChallengeCategory {
  id: string;
  label: string;
  icon: string;       // Ionicons name
  color: string;
}

export interface ChallengeTemplate {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  inputType: 'boolean' | 'number' | 'text' | 'timer';
  unitLabel?: string;
  minValue?: number;
  cadenceUnit: 'daily' | 'weekly';
  requireAttachment: boolean;
}

export const CHALLENGE_CATEGORIES: ChallengeCategory[] = [
  { id: 'fitness',    label: 'Fitness',     icon: 'barbell-outline',       color: '#EF4444' },
  { id: 'diet',       label: 'Diet',        icon: 'nutrition-outline',     color: '#22C55E' },
  { id: 'study',      label: 'Study',       icon: 'book-outline',         color: '#3B82F6' },
  { id: 'mindfulness',label: 'Mindfulness', icon: 'leaf-outline',         color: '#8B5CF6' },
  { id: 'productivity',label: 'Productivity',icon: 'rocket-outline',      color: '#F59E0B' },
  { id: 'health',     label: 'Health',      icon: 'heart-outline',        color: '#EC4899' },
  { id: 'creative',   label: 'Creative',    icon: 'color-palette-outline',color: '#06B6D4' },
  { id: 'finance',    label: 'Finance',     icon: 'cash-outline',         color: '#10B981' },
  { id: 'social',     label: 'Social',      icon: 'people-outline',       color: '#F97316' },
  { id: 'custom',     label: 'Custom',      icon: 'create-outline',       color: '#6B7280' },
];

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // Fitness
  { id: 'gym',          categoryId: 'fitness', title: 'Hit the Gym',           description: 'Complete a gym workout',                        inputType: 'boolean', cadenceUnit: 'daily', requireAttachment: true },
  { id: 'run',          categoryId: 'fitness', title: 'Daily Run',             description: 'Go for a run and log your distance',            inputType: 'number',  unitLabel: 'miles', cadenceUnit: 'daily', requireAttachment: false },
  { id: 'steps',        categoryId: 'fitness', title: '10K Steps',             description: 'Walk at least 10,000 steps',                    inputType: 'number',  unitLabel: 'steps', minValue: 10000, cadenceUnit: 'daily', requireAttachment: false },
  { id: 'pushups',      categoryId: 'fitness', title: 'Push-up Challenge',     description: 'Do your daily push-ups',                        inputType: 'number',  unitLabel: 'reps', cadenceUnit: 'daily', requireAttachment: false },

  // Diet
  { id: 'water',        categoryId: 'diet',    title: 'Drink Water',           description: 'Drink enough water today',                      inputType: 'number',  unitLabel: 'glasses', minValue: 8, cadenceUnit: 'daily', requireAttachment: false },
  { id: 'no-junk',      categoryId: 'diet',    title: 'No Junk Food',          description: 'Avoid junk food and eat clean',                 inputType: 'boolean', cadenceUnit: 'daily', requireAttachment: false },
  { id: 'meal-prep',    categoryId: 'diet',    title: 'Meal Prep',             description: 'Prepare healthy meals for the day',              inputType: 'boolean', cadenceUnit: 'daily', requireAttachment: true },
  { id: 'calories',     categoryId: 'diet',    title: 'Track Calories',        description: 'Log your daily calorie intake',                  inputType: 'number',  unitLabel: 'calories', cadenceUnit: 'daily', requireAttachment: false },

  // Study
  { id: 'study-time',   categoryId: 'study',   title: 'Study Session',         description: 'Complete a focused study session',               inputType: 'timer',   cadenceUnit: 'daily', requireAttachment: false },
  { id: 'read',         categoryId: 'study',   title: 'Read Daily',            description: 'Read at least 30 minutes',                       inputType: 'timer',   minValue: 1800, cadenceUnit: 'daily', requireAttachment: false },
  { id: 'flashcards',   categoryId: 'study',   title: 'Flashcard Review',      description: 'Review your flashcards',                         inputType: 'number',  unitLabel: 'cards', cadenceUnit: 'daily', requireAttachment: false },
  { id: 'homework',     categoryId: 'study',   title: 'Complete Homework',     description: 'Finish your assignments for the day',            inputType: 'boolean', cadenceUnit: 'daily', requireAttachment: false },

  // Mindfulness
  { id: 'meditate',     categoryId: 'mindfulness', title: 'Meditate',          description: 'Practice meditation',                            inputType: 'timer',   cadenceUnit: 'daily', requireAttachment: false },
  { id: 'journal',      categoryId: 'mindfulness', title: 'Daily Journal',     description: 'Write in your journal',                          inputType: 'text',    cadenceUnit: 'daily', requireAttachment: false },
  { id: 'gratitude',    categoryId: 'mindfulness', title: 'Gratitude Log',     description: 'Write 3 things you are grateful for',             inputType: 'text',    cadenceUnit: 'daily', requireAttachment: false },
  { id: 'no-phone',     categoryId: 'mindfulness', title: 'Screen-Free Hour',  description: 'Spend an hour without your phone',               inputType: 'boolean', cadenceUnit: 'daily', requireAttachment: false },

  // Productivity
  { id: 'wake-early',   categoryId: 'productivity', title: 'Wake Up Early',    description: 'Wake up before your target time',                inputType: 'boolean', cadenceUnit: 'daily', requireAttachment: false },
  { id: 'deep-work',    categoryId: 'productivity', title: 'Deep Work',        description: 'Complete a deep work session',                   inputType: 'timer',   cadenceUnit: 'daily', requireAttachment: false },
  { id: 'no-social',    categoryId: 'productivity', title: 'No Social Media',  description: 'Stay off social media for the day',              inputType: 'boolean', cadenceUnit: 'daily', requireAttachment: false },
  { id: 'todo-list',    categoryId: 'productivity', title: 'Complete To-Do',   description: 'Finish everything on your to-do list',           inputType: 'boolean', cadenceUnit: 'daily', requireAttachment: false },

  // Health
  { id: 'sleep',        categoryId: 'health',  title: 'Sleep 8 Hours',         description: 'Get at least 8 hours of sleep',                  inputType: 'number',  unitLabel: 'hours', minValue: 8, cadenceUnit: 'daily', requireAttachment: false },
  { id: 'no-smoking',   categoryId: 'health',  title: 'No Smoking',            description: 'Stay smoke-free today',                          inputType: 'boolean', cadenceUnit: 'daily', requireAttachment: false },
  { id: 'stretch',      categoryId: 'health',  title: 'Daily Stretch',         description: 'Complete a stretching routine',                   inputType: 'boolean', cadenceUnit: 'daily', requireAttachment: false },

  // Creative
  { id: 'draw',         categoryId: 'creative', title: 'Daily Sketch',         description: 'Draw or sketch something today',                 inputType: 'boolean', cadenceUnit: 'daily', requireAttachment: true },
  { id: 'write',        categoryId: 'creative', title: 'Write Daily',          description: 'Write at least 500 words',                       inputType: 'number',  unitLabel: 'words', minValue: 500, cadenceUnit: 'daily', requireAttachment: false },
  { id: 'practice',     categoryId: 'creative', title: 'Practice Instrument',  description: 'Practice your instrument',                       inputType: 'timer',   cadenceUnit: 'daily', requireAttachment: false },

  // Finance
  { id: 'no-spend',     categoryId: 'finance', title: 'No-Spend Day',          description: 'Don\'t spend any money today',                   inputType: 'boolean', cadenceUnit: 'daily', requireAttachment: false },
  { id: 'save',         categoryId: 'finance', title: 'Save Money',            description: 'Set aside money into savings',                   inputType: 'number',  unitLabel: 'dollars', cadenceUnit: 'weekly', requireAttachment: false },
  { id: 'budget',       categoryId: 'finance', title: 'Track Spending',        description: 'Log all your expenses for the day',              inputType: 'boolean', cadenceUnit: 'daily', requireAttachment: false },

  // Social
  { id: 'call-friend',  categoryId: 'social',  title: 'Call a Friend',         description: 'Call or video chat with a friend or family',     inputType: 'boolean', cadenceUnit: 'weekly', requireAttachment: false },
  { id: 'compliment',   categoryId: 'social',  title: 'Give a Compliment',     description: 'Give someone a genuine compliment',              inputType: 'text',    cadenceUnit: 'daily', requireAttachment: false },
];
