import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../translate/translate.pipe';

@Component({
    selector: 'app-confirm-exit-dialog',
    imports: [MatDialogModule, MatButtonModule, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <h2 mat-dialog-title>{{ 'ESCAPE_ROOM.EXIT_TITLE' | translate }}</h2>
    <mat-dialog-content>
      <p>{{ 'ESCAPE_ROOM.EXIT_BODY' | translate }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">{{ 'ESCAPE_ROOM.EXIT_CANCEL' | translate }}</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">{{ 'ESCAPE_ROOM.EXIT_CONFIRM' | translate }}</button>
    </mat-dialog-actions>
  `
})
export class ConfirmExitDialogComponent {}
