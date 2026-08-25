import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StrategicThinkingSkill16Component } from './strategic-thinking-skill16.component';

describe('StrategicThinkingSkill16Component', () => {
  let component: StrategicThinkingSkill16Component;
  let fixture: ComponentFixture<StrategicThinkingSkill16Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StrategicThinkingSkill16Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StrategicThinkingSkill16Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
