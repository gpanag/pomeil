import { TestBed } from '@angular/core/testing';
import { TranslatePipe } from "./translate.pipe";
import { TranslateService } from './translate.service';

describe('TranslatePipe', () => {
  it('create an instance', () => {
    const service: TranslateService = TestBed.get(TranslateService);
    const pipe = new TranslatePipe(service);
    expect(pipe).toBeTruthy();
  });
});

