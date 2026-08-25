import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinancialSkill10BComponent } from './financial-skill10-b.component';

describe('FinancialSkill10BComponent', () => {
  let component: FinancialSkill10BComponent;
  let fixture: ComponentFixture<FinancialSkill10BComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FinancialSkill10BComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinancialSkill10BComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
