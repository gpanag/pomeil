import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenMindnessSkillSkill26Component } from './open-mindness-skill-skill26.component';

describe('OpenMindnessSkillSkill26Component', () => {
  let component: OpenMindnessSkillSkill26Component;
  let fixture: ComponentFixture<OpenMindnessSkillSkill26Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OpenMindnessSkillSkill26Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenMindnessSkillSkill26Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
