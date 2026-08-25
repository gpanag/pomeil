import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpathySkill22Component } from './empathy-skill22.component';

describe('EmpathySkill22Component', () => {
  let component: EmpathySkill22Component;
  let fixture: ComponentFixture<EmpathySkill22Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmpathySkill22Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpathySkill22Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
