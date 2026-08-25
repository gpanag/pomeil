export interface PuzzleScore {
  puzzleId: string;
  wrongAttempts: number;
  wasRevealed: boolean;
  score: number; // 0-100
}

export interface RoomScore {
  roomId: string;
  puzzleScores: PuzzleScore[];
  overallScore: number; // 0-100, average of puzzle scores
  completedAt: string;  // ISO date
}

export interface LearningFlowState {
  selectedSkills: string[];       // room IDs
  roomScores: { [roomId: string]: RoomScore };
  currentSkillIndex: number;
  questionnaireCompleted: boolean;
  questionnaireAnswers: { [questionId: string]: string };
}

export function calculatePuzzleScore(wrongAttempts: number, wasRevealed: boolean): number {
  if (wasRevealed) return 0;
  if (wrongAttempts === 0) return 100;
  if (wrongAttempts === 1) return 67;
  if (wrongAttempts === 2) return 33;
  return 0;
}

export function calculateOverallRoomScore(puzzleScores: PuzzleScore[]): number {
  if (puzzleScores.length === 0) return 0;
  const total = puzzleScores.reduce((sum, ps) => sum + ps.score, 0);
  return Math.round(total / puzzleScores.length);
}
