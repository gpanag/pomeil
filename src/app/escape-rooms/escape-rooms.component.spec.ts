import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscapeRoomsComponent } from './escape-rooms.component';

describe('EscapeRoomsComponent', () => {
  let component: EscapeRoomsComponent;
  let fixture: ComponentFixture<EscapeRoomsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EscapeRoomsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EscapeRoomsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
