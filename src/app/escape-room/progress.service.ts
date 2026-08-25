import { Injectable } from '@angular/core';

interface SceneStatus {
  questionSolved: boolean;
  cluesFound: boolean[];
  completed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProgressService {

  // Progress state: tracks current scene index and per-scene puzzle status
  progress: {
    currentScene: number;
    sceneStatus: SceneStatus[];
  };

  constructor() {
    // Load progress from localStorage or initialize new
    const saved = localStorage.getItem('escapeRoomProgress');
    if (saved) {
      this.progress = JSON.parse(saved);
    } else {
      // Initialize for 3 scenes. Scene 0 has 2 clues, scenes 1 and 2 have 1 clue each.
      this.progress = {
        currentScene: 0,
        sceneStatus: [
          { questionSolved: false, cluesFound: [false, false], completed: false }, // scene 0 (two clues)
          { questionSolved: false, cluesFound: [false], completed: false },        // scene 1 (one clue)
          { questionSolved: false, cluesFound: [false], completed: false }         // scene 2 (one clue)
        ]
      };
    }
  }

  saveProgress(): void {
    localStorage.setItem('escapeRoomProgress', JSON.stringify(this.progress));
  }

  markQuestionSolved(sceneIndex: number): void {
    this.progress.sceneStatus[sceneIndex].questionSolved = true;
    this.updateSceneCompletion(sceneIndex);
    this.saveProgress();
  }

  markClueFound(sceneIndex: number, clueIndex: number): void {
    this.progress.sceneStatus[sceneIndex].cluesFound[clueIndex] = true;
    this.updateSceneCompletion(sceneIndex);
    this.saveProgress();
  }

  private updateSceneCompletion(sceneIndex: number): void {
    const status = this.progress.sceneStatus[sceneIndex];
    const allClues = status.cluesFound.every(found => found);
    status.completed = status.questionSolved && allClues;
  }

  isQuestionSolved(sceneIndex: number): boolean {
    return this.progress.sceneStatus[sceneIndex].questionSolved;
  }

  isCluesComplete(sceneIndex: number): boolean {
    return this.progress.sceneStatus[sceneIndex].cluesFound.every(found => found);
  }

  isSceneComplete(sceneIndex: number): boolean {
    return this.progress.sceneStatus[sceneIndex].completed;
  }

  nextScene(): number {
    const maxIndex = this.progress.sceneStatus.length - 1;
    if (this.progress.currentScene < maxIndex) {
      this.progress.currentScene++;
      this.saveProgress();
    }
    return this.progress.currentScene;
  }

  resetProgress(): void {
    localStorage.removeItem('escapeRoomProgress');
    // Re-initialize state for a new game
    this.progress = {
      currentScene: 0,
      sceneStatus: [
        { questionSolved: false, cluesFound: [false, false], completed: false },
        { questionSolved: false, cluesFound: [false], completed: false },
        { questionSolved: false, cluesFound: [false], completed: false }
      ]
    };
    this.saveProgress();
  }

    isNewGame(): boolean {
    const firstSceneStatus = this.progress.sceneStatus[0];
    // A game is "new" if we are on the first scene AND nothing has been solved or found yet.
    const isFirstSceneUntouched = !firstSceneStatus.questionSolved && firstSceneStatus.cluesFound.every(found => !found);
    return this.progress.currentScene === 0 && isFirstSceneUntouched;
  }
  
}