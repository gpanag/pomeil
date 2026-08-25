import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeafletsComponent } from './leaflets.component';

describe('LeafletsComponent', () => {
  let component: LeafletsComponent;
  let fixture: ComponentFixture<LeafletsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LeafletsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeafletsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
